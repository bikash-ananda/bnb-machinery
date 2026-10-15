"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { LocalizedText, useLanguage } from "@/components/i18n/LanguageProvider";
import StockLibraryPicker from "@/components/staff/StockLibraryPicker";

type SelectedImage = { id: string; file: File; url: string; lowQuality: boolean };

function inspectImage(file: File) {
  return new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      let lowQuality = image.naturalWidth < 640 || image.naturalHeight < 480;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.drawImage(image, 0, 0, 32, 32);
          const pixels = context.getImageData(0, 0, 32, 32).data;
          let luminance = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            luminance +=
              (pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722) /
              255;
          }
          lowQuality ||= luminance / (pixels.length / 4) < 0.12;
        }
      } catch {
        // Browsers without canvas support still get the resolution check.
      }
      URL.revokeObjectURL(url);
      resolve(lowQuality);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    image.src = url;
  });
}

function uploadWithProgress(
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<{ id: string; error?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/staff/inventory");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let result: { id?: string; error?: string } = {};
      try {
        result = JSON.parse(xhr.responseText) as { id?: string; error?: string };
      } catch {
        reject(new Error("The image could not be uploaded. Please try again."));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !result.id) {
        reject(new Error(result.error || "The image could not be uploaded. Please try again."));
        return;
      }
      resolve({ id: result.id });
    };
    xhr.onerror = () => reject(new Error("The image could not be uploaded. Please try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.timeout = 120_000;
    xhr.ontimeout = () => reject(new Error("The image could not be uploaded. Please try again."));
    xhr.send(form);
  });
}

/** Shrinks big phone photos in the browser (hosting rejects uploads over about 4.5 MB). */
async function shrinkImage(file: File): Promise<File> {
  if (file.size < 1_200_000) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.86));
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
export default function AddStockForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const cameraRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const multipleRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedImage[]>([]);
  const filesRef = useRef<SelectedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function updateFiles(updater: (current: SelectedImage[]) => SelectedImage[]) {
    setFiles((current) => {
      const next = updater(current);
      filesRef.current = next;
      return next;
    });
  }

  useEffect(() => () => {
    filesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    setError("");
    if (selected.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (selected.some((file) => file.size === 0 || file.size > 10 * 1024 * 1024)) {
      setError("Each image must be 10 MB or smaller.");
      return;
    }
    if (files.length + selected.length > 5 || files.reduce((sum, image) => sum + image.file.size, 0) + selected.reduce((sum, file) => sum + file.size, 0) > 25 * 1024 * 1024) {
      setError("Choose up to 5 images, with a 25 MB total limit.");
      return;
    }
    const additions = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      lowQuality: false,
    }));
    updateFiles((current) => [...current, ...additions]);
    void Promise.all(additions.map((image) => inspectImage(image.file))).then((quality) => {
      const qualityById = new Map(additions.map((image, index) => [image.id, quality[index]]));
      updateFiles((current) =>
        current.map((image) =>
          qualityById.has(image.id)
            ? { ...image, lowQuality: qualityById.get(image.id) ?? false }
            : image,
        ),
      );
    });
  }

  function removeFile(index: number) {
    const image = files[index];
    if (image) URL.revokeObjectURL(image.url);
    updateFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveFile(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    updateFiles((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function createDraft() {
    if (files.length === 0) {
      setError(t("imageUploadError"));
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);
    const form = new FormData();
    try {
      for (const image of files) form.append("images", await shrinkImage(image.file));
    } catch {
      setError(t("imageUploadError"));
      setBusy(false);
      return;
    }

    try {
      const result = await uploadWithProgress(form, setProgress);
      const identification = await fetch(
        "/api/staff/inventory/" + encodeURIComponent(result.id) + "/identify",
        { method: "POST" },
      ).catch(() => null);
      if (identification && !identification.ok) {
        setError(t("aiFailed"));
      } else if (identification) {
        const aiResult = (await identification.json().catch(() => null)) as { status?: string } | null;
        if (aiResult?.status === "unavailable") setError(t("aiNotConfigured"));
      }
      router.push("/staff/inventory/" + encodeURIComponent(result.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("imageUploadError"));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <StockLibraryPicker />
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700"><LocalizedText id="stockEntry" /></p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--brand-primary)] sm:text-3xl"><LocalizedText id="uploadTitle" /></h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--text-muted)]"><LocalizedText id="uploadDescription" /></p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-14 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-secondary)]"
          >
            <span aria-hidden="true" className="mr-2">◎</span><LocalizedText id="takePhoto" />
          </button>
          <button
            type="button"
            onClick={() => phoneRef.current?.click()}
            className="min-h-14 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--surface-muted)]"
          >
            <LocalizedText id="uploadFromPhone" />
          </button>
          <button
            type="button"
            onClick={() => multipleRef.current?.click()}
            className="min-h-14 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-[var(--surface-muted)]"
          >
            <LocalizedText id="chooseMultiple" />
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]"><LocalizedText id="imageRequirements" /></p>
        <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={addFiles} className="hidden" aria-label={t("takePhoto")} />
        <input ref={phoneRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={addFiles} className="hidden" aria-label={t("uploadFromPhone")} />
        <input ref={multipleRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} className="hidden" aria-label={t("chooseMultiple")} />
      </section>

      {files.length ? (
        <section aria-label={t("imageGallery")} className="space-y-3">
          {files.map((image, index) => {
            const file = image.file;
            return (
            <article key={image.id} className="flex gap-3 rounded-xl border border-[var(--border)] bg-white p-3 sm:gap-4 sm:p-4">
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-muted)] sm:h-32 sm:w-40">
                <NextImage src={image.url} alt={t("imageGallery") + " " + (index + 1)} width={400} height={300} unoptimized className="h-full w-full object-cover" />
                {index === 0 ? <span className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-semibold text-white">{t("primaryImage")}</span> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                {image.lowQuality ? <p className="mt-2 text-xs leading-5 text-amber-800">{t("imageQualityWarning")}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => moveFile(index, -1)} disabled={index === 0} aria-label={t("moveImageUp")} className="min-h-10 min-w-10 rounded-md border border-[var(--border)] px-2 text-sm disabled:opacity-40">↑</button>
                  <button type="button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1} aria-label={t("moveImageDown")} className="min-h-10 min-w-10 rounded-md border border-[var(--border)] px-2 text-sm disabled:opacity-40">↓</button>
                  <button type="button" onClick={() => removeFile(index)} aria-label={t("removeImage")} className="min-h-10 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50">
                    {t("removeImage")}
                  </button>
                </div>
              </div>
            </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center text-sm text-[var(--text-muted)]">
          {t("uploadDescription")}
        </div>
      )}

      {error ? <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{error}</p> : null}
      {busy ? (
        <div role="status" className="rounded-xl bg-slate-100 px-4 py-3">
          <div className="flex justify-between gap-4 text-sm font-medium text-slate-800">
            <span>{t("uploadProgress")}</span><span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: progress + "%" }} />
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-20 z-20 -mx-4 border-t border-[var(--border)] bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.07)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <button
          type="button"
          onClick={() => void createDraft()}
          disabled={busy || files.length === 0}
          className="min-h-14 w-full rounded-xl bg-[var(--brand-primary)] px-6 py-4 text-sm font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-64"
        >
          {busy ? t("loading") : t("continueReview")}
        </button>
      </div>
    </div>
  );
}
