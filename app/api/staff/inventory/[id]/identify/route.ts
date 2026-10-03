import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getStaffSession, isAllowedOrigin } from "@/lib/server/auth";
import { getInventoryProduct } from "@/lib/server/inventory";
import {
  callRpc,
  dbRequest,
  downloadPrivateImage,
  hasSupabaseConfig,
} from "@/lib/server/supabase";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ImageStorageRow = { storage_path: string; mime_type: string };
type ResponseContent = { type?: string; text?: string };
type ResponsesApiResult = {
  output?: { type?: string; content?: ResponseContent[] }[];
};

function parseSuggestions(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid AI response.");
  const data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  const safeString = (key: string, max: number) => {
    const value = data[key];
    return typeof value === "string" ? value.trim().slice(0, max) || null : null;
  };
  const strings = (key: string, maxCount: number, maxLength: number) => {
    const value = data[key];
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
      .slice(0, maxCount);
  };
  const specifications = Array.isArray(data.specifications)
    ? data.specifications.slice(0, 30).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        if (typeof row.name !== "string" || typeof row.value !== "string") return [];
        return [{ name: row.name.slice(0, 80), value: row.value.slice(0, 160) }];
      })
    : [];

  return {
    nameEn: safeString("nameEn", 160),
    category: safeString("category", 100),
    brand: safeString("brand", 100),
    model: safeString("model", 120),
    partNumber: safeString("partNumber", 120),
    shortDescriptionEn: safeString("shortDescriptionEn", 500),
    descriptionEn: safeString("descriptionEn", 2000),
    specifications,
    applications: strings("applications", 15, 120),
  };
}

export async function POST(request: Request, context: Context) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }
  let session;
  try {
    session = await getStaffSession();
  } catch {
    return NextResponse.json({ error: "Authentication could not be checked. Please try again." }, { status: 503 });
  }
  if (!session) return NextResponse.json({ error: "Sign in to identify this item." }, { status: 401 });
  if (session.role !== "INVENTORY_EDITOR") {
    return NextResponse.json({ error: "Only inventory staff can prepare stock drafts." }, { status: 403 });
  }
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Stock item not found." }, { status: 404 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  const product = await getInventoryProduct(id).catch(() => null);
  const primaryImage = product?.images?.[0];
  if (!product || product.created_by !== session.email || !primaryImage) {
    return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
  }
  if (!apiKey || !model) {
    if (product.ai_status === "NOT_REQUESTED") {
      try {
        await callRpc<boolean>("record_ai_unavailable", {
          p_actor: session.email,
          p_product_id: id,
        });
      } catch {
        // Keep manual review available even if the optional AI service is offline.
      }
    }
    return NextResponse.json({ status: "unavailable" });
  }
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Inventory services are not configured yet." }, { status: 503 });
  }
  if (product.ai_status !== "NOT_REQUESTED") {
    return NextResponse.json(
      { error: "AI identification has already been attempted for this draft. Continue manual review." },
      { status: 409 },
    );
  }

  try {
    const started = await callRpc<boolean>("begin_inventory_ai_request", {
      p_actor: session.email,
      p_product_id: id,
    });
    if (!started) {
      return NextResponse.json(
        { error: "This draft is no longer waiting for AI identification." },
        { status: 409 },
      );
    }
    const imageRows = await dbRequest<ImageStorageRow[]>(
      "product_images?select=storage_path,mime_type&id=eq." +
        encodeURIComponent(primaryImage.id) +
        "&product_id=eq." +
        encodeURIComponent(id) +
        "&limit=1",
    );
    const image = imageRows[0];
    if (!image) return NextResponse.json({ error: "Product image not found." }, { status: 404 });
    const stored = await downloadPrivateImage(image.storage_path);
    const dataUrl = "data:" + image.mime_type + ";base64," + stored.bytes.toString("base64");

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: "Bearer " + apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Inspect this machinery or machinery-parts photo. Return only a JSON object with keys nameEn, category, brand, model, partNumber, shortDescriptionEn, descriptionEn, specifications, applications. Use null for every string you cannot read or identify reliably and [] for unknown arrays. Do not infer brand, model, part number, material, dimensions, capacity, compatibility, price, quantity, certifications, or other specifications. Describe only visible facts. This is an unverified suggestion for staff review, never a confirmed identification.",
              },
              { type: "input_image", image_url: dataUrl, detail: "high" },
            ],
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(35_000),
    });

    if (!aiResponse.ok) {
      await callRpc<boolean>("fail_inventory_ai_request", {
        p_actor: session.email,
        p_product_id: id,
      });
      return NextResponse.json(
        { error: "AI identification is temporarily unavailable. You can continue reviewing the draft manually." },
        { status: 503 },
      );
    }

    const responseData = (await aiResponse.json()) as ResponsesApiResult;
    const outputText =
      responseData.output
        ?.flatMap((item) => item.content ?? [])
        .find((item) => item.type === "output_text")?.text ?? "";
    if (!outputText) throw new Error("No AI suggestion returned.");

    const suggestions = parseSuggestions(outputText);
    const saved = await callRpc<boolean>("set_inventory_ai_suggestions", {
      p_actor: session.email,
      p_product_id: id,
      p_suggestions: suggestions,
      p_model: model,
    });
    if (!saved) {
      return NextResponse.json({ error: "This draft can no longer be updated." }, { status: 409 });
    }
    return NextResponse.json({ status: "ready", requestId: randomUUID() });
  } catch {
    await callRpc<boolean>("fail_inventory_ai_request", {
      p_actor: session.email,
      p_product_id: id,
    }).catch(() => false);
    return NextResponse.json(
      { error: "AI identification is temporarily unavailable. You can continue reviewing the draft manually." },
      { status: 503 },
    );
  }
}
