"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LocalizedText, useLanguage } from "@/components/i18n/LanguageProvider";
import StatusLabel from "@/components/staff/StatusLabel";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ProductRecord } from "@/lib/inventory/types";

type EditorMode = "staff" | "owner";
type Fields = {
  nameEn: string;
  nameNe: string;
  descriptionEn: string;
  descriptionNe: string;
  category: string;
  brand: string;
  model: string;
  partNumber: string;
  stockQuantity: string;
  specifications: string;
  applications: string;
};

function unpackSuggestions(product: ProductRecord) {
  const root = product.ai_suggestions;
  if (!root || typeof root !== "object") return null;
  const fields = (root as { fields?: unknown }).fields;
  if (!fields || typeof fields !== "object") return null;
  return fields as Record<string, unknown>;
}

function parseSpecifications(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const splitAt = line.indexOf(":");
      if (splitAt < 1 || splitAt === line.length - 1) {
        throw new Error("Use one detail per line in the format name: value.");
      }
      return { name: line.slice(0, splitAt).trim(), value: line.slice(splitAt + 1).trim() };
    });
}

export default function ProductEditor({
  product,
  mode,
}: {
  product: ProductRecord;
  mode: EditorMode;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const suggestions = useMemo(() => unpackSuggestions(product), [product]);
  const [fields, setFields] = useState<Fields>({
    nameEn: product.name_en ?? "",
    nameNe: product.name_ne ?? "",
    descriptionEn: product.description_en ?? "",
    descriptionNe: product.description_ne ?? "",
    category: product.category_name_en ?? "",
    brand: product.brand_name ?? "",
    model: product.model ?? "",
    partNumber: product.part_number ?? "",
    stockQuantity: product.stock_quantity === null ? "" : String(product.stock_quantity),
    specifications: product.specifications.map((item) => item.name + ": " + item.value).join("\n"),
    applications: product.applications.join(", "),
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function updateField(key: keyof Fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function sendAction(action: string, extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/staff/inventory/" + encodeURIComponent(product.id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error || t("formError"));
  }

  async function saveFields() {
    const specifications = parseSpecifications(fields.specifications);
    const applications = fields.applications
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    await sendAction("save", {
      fields: {
        nameEn: fields.nameEn,
        nameNe: fields.nameNe,
        descriptionEn: fields.descriptionEn,
        descriptionNe: fields.descriptionNe,
        category: fields.category,
        brand: fields.brand,
        model: fields.model,
        partNumber: fields.partNumber,
        stockQuantity: fields.stockQuantity || null,
        specifications,
        applications,
      },
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    if (mode === "staff" && !fields.nameEn.trim() && !fields.nameNe.trim()) {
      setBusy(false);
      setError(t("nameRequired"));
      return;
    }
    try {
      await saveFields();
      setMessage(t("productSaved"));
      if (mode === "staff") {
        await sendAction("submit");
        setMessage(t("productSubmitted"));
        window.setTimeout(() => router.push("/staff"), 900);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("formError"));
    } finally {
      setBusy(false);
    }
  }

  async function ownerAction(action: "approve" | "reject" | "correction") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveFields();
      await sendAction(action, { note });
      setMessage(
        action === "approve"
          ? t("approvalComplete")
          : action === "reject"
            ? t("rejectionComplete")
            : t("correctionComplete"),
      );
      window.setTimeout(() => router.push("/staff/review"), 900);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("formError"));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-3 text-base text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  const labelClass = "block text-sm font-medium text-slate-800";

  function suggestionText(key: string) {
    const value = suggestions?.[key];
    if (typeof value === "string" && value.trim()) return value;
    return t("unknownValue");
  }

  const suggestionRows: { key: string; label: MessageKey; target: keyof Fields }[] = [
    { key: "nameEn", label: "nameEn", target: "nameEn" },
    { key: "brand", label: "brandName", target: "brand" },
    { key: "category", label: "categoryName", target: "category" },
    { key: "model", label: "model", target: "model" },
    { key: "partNumber", label: "partNumber", target: "partNumber" },
    { key: "descriptionEn", label: "descriptionEn", target: "descriptionEn" },
  ];

  function applySuggestion(key: string, target: keyof Fields) {
    const value = suggestions?.[key];
    if (typeof value === "string" && value.trim()) {
      updateField(target, value.trim());
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 pb-4">
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {mode === "owner" ? t("productReview") : t("stockEntry")}
            </p>
            <h1 className="mt-1 text-xl font-bold text-[var(--brand-primary)]">
              {fields.nameEn || fields.nameNe || t("addStock")}
            </h1>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            <StatusLabel status={product.verification_status} />
          </span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          {product.images?.map((image, index) => (
            <div
              key={image.id}
              className={
                "overflow-hidden rounded-xl bg-[var(--surface-muted)] " +
                (index === 0 ? "sm:col-span-2" : "")
              }
            >
              <Image
                src={"/api/inventory/images/" + encodeURIComponent(image.id)}
                alt={t("uploadedPhoto") + " " + (index + 1)}
                width={1200}
                height={900}
                unoptimized
                className={index === 0 ? "max-h-[50svh] w-full object-contain" : "aspect-[4/3] w-full object-cover"}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--brand-primary)]">
          <LocalizedText id="lensTitle" />
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          <LocalizedText id="lensNote" />
        </p>
        <button
          type="button"
          onClick={() => window.open("https://lens.google.com/", "_blank", "noopener,noreferrer")}
          className="mt-4 min-h-12 rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--surface-muted)]"
        >
          <LocalizedText id="lensAction" />
        </button>
      </section>

      {suggestions ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-amber-950"><LocalizedText id="aiDraftTitle" /></h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900">
              <LocalizedText id="aiSuggested" />
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-amber-900"><LocalizedText id="aiSourceNote" /></p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {suggestionRows.map(({ key, label, target }) => (
              <div key={key} className="rounded-lg border border-amber-200/70 bg-white/70 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t(label)}</dt>
                <dd className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">{suggestionText(key)}</dd>
                {typeof suggestions[key] === "string" && suggestions[key] ? (
                  <button type="button" onClick={() => applySuggestion(key, target)} className="mt-2 min-h-9 text-xs font-semibold text-amber-900 underline underline-offset-4">
                    {t("useSuggestion")}
                  </button>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
          {product.ai_status === "UNAVAILABLE" ? t("aiNotConfigured") : t("aiUncertain")}
        </p>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--brand-primary)]"><LocalizedText id="identification" /></h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            <LocalizedText id="nameEn" />
            <input className={inputClass} value={fields.nameEn} maxLength={160} onChange={(event) => updateField("nameEn", event.target.value)} />
          </label>
          <label className={labelClass}>
            <LocalizedText id="nameNe" />
            <input className={inputClass} value={fields.nameNe} maxLength={160} onChange={(event) => updateField("nameNe", event.target.value)} />
          </label>
          <label className={labelClass}>
            <LocalizedText id="categoryName" />
            <input className={inputClass} value={fields.category} maxLength={100} onChange={(event) => updateField("category", event.target.value)} />
          </label>
          <label className={labelClass}>
            <LocalizedText id="brandName" />
            <input className={inputClass} value={fields.brand} maxLength={100} onChange={(event) => updateField("brand", event.target.value)} />
          </label>
          <label className={labelClass}>
            <LocalizedText id="model" />
            <input className={inputClass} value={fields.model} maxLength={120} onChange={(event) => updateField("model", event.target.value)} />
          </label>
          <label className={labelClass}>
            <LocalizedText id="partNumber" />
            <input className={inputClass} value={fields.partNumber} maxLength={120} onChange={(event) => updateField("partNumber", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--brand-primary)]"><LocalizedText id="description" /></h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            <LocalizedText id="descriptionEn" />
            <textarea className={inputClass + " min-h-36"} value={fields.descriptionEn} maxLength={4000} onChange={(event) => updateField("descriptionEn", event.target.value)} />
          </label>
          <label className={labelClass}>
            <LocalizedText id="descriptionNe" />
            <textarea className={inputClass + " min-h-36"} value={fields.descriptionNe} maxLength={4000} onChange={(event) => updateField("descriptionNe", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--brand-primary)]"><LocalizedText id="stockEntry" /></h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            <LocalizedText id="stockQuantity" />
            <input
              type="number"
              min={0}
              max={1_000_000_000}
              step={1}
              inputMode="numeric"
              placeholder={t("stockPlaceholder")}
              className={inputClass}
              value={fields.stockQuantity}
              onChange={(event) => updateField("stockQuantity", event.target.value)}
            />
          </label>
          <div className="flex items-end text-sm text-[var(--text-muted)]">
            <LocalizedText id="specificationHint" />
          </div>
          <label className={labelClass}>
            <LocalizedText id="specifications" />
            <textarea
              className={inputClass + " min-h-32 font-mono text-sm"}
              placeholder="Name: value"
              value={fields.specifications}
              onChange={(event) => updateField("specifications", event.target.value)}
            />
          </label>
          <label className={labelClass}>
            <LocalizedText id="applications" />
            <textarea
              className={inputClass + " min-h-32"}
              placeholder={t("applicationsHint")}
              value={fields.applications}
              onChange={(event) => updateField("applications", event.target.value)}
            />
            <span className="mt-2 block text-xs font-normal leading-5 text-[var(--text-muted)]">{t("applicationsHint")}</span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-[var(--text-muted)]"><LocalizedText id="verification" /></dt><dd className="mt-1 font-semibold">{product.verification_status.replaceAll("_", " ")}</dd></div>
          <div><dt className="text-[var(--text-muted)]"><LocalizedText id="publication" /></dt><dd className="mt-1 font-semibold">{product.publication_status === "PUBLISHED" ? t("publishedProduct") : t("privateProduct")}</dd></div>
        </dl>
      </section>

        {mode === "owner" ? (
          <label className={labelClass}>
            <LocalizedText id="correctionNote" />
          <textarea id="owner-note" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass + " min-h-24"} />
        </label>
      ) : null}

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {message ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p> : null}

      <div className="sticky bottom-20 z-20 -mx-4 border-t border-[var(--border)] bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.07)] backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        {mode === "staff" ? (
          <div className="flex w-full gap-3 sm:w-auto">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                setMessage("");
                try {
                  await saveFields();
                  setMessage(t("productSaved"));
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : t("formError"));
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-12 flex-1 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--brand-primary)] sm:flex-none sm:px-6"
            >
              {t("saveDraft")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 flex-1 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60 sm:flex-none sm:px-6"
            >
              {busy ? t("loading") : t("submitForOwner")}
            </button>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
            <button type="button" disabled={busy} onClick={() => void ownerAction("reject")} className="min-h-12 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">
              {t("rejectProduct")}
            </button>
            <button type="button" disabled={busy} onClick={() => void ownerAction("correction")} className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--surface-muted)] disabled:opacity-60">
              {t("requestCorrection")}
            </button>
            <button type="button" disabled={busy} onClick={() => void ownerAction("approve")} className="min-h-12 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60">
              {busy ? t("loading") : t("approvePublish")}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
