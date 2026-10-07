"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";

function localizedError(error: string, t: (key: MessageKey) => string) {
  if (error.includes("not authorized")) return t("unauthorizedEmail");
  if (error.includes("expired")) return t("expiredCode");
  if (error.includes("incorrect")) return t("incorrectCode");
  if (error.includes("not configured")) return t("loginSetupMessage");
  return error || t("loginGenericError");
}

export default function StaffLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { t } = useLanguage();

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/staff/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(localizedError(result.error ?? "", t));
      } else {
        setStep("code");
        setNotice(t("codeSent"));
      }
    } catch {
      setError(t("loginGenericError"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/staff/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = (await response.json()) as { role?: string; error?: string };
      if (!response.ok) {
        setError(localizedError(result.error ?? "", t));
      } else {
        router.push(result.role === "OWNER" ? "/staff/review" : "/staff");
      }
    } catch {
      setError(t("loginGenericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-sm font-bold text-white">
        MTN
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">
        <span>{t("internalOnly")}</span>
      </p>
      <h1 className="mt-3 text-2xl font-bold text-[var(--brand-primary)]">
        {t("staffSignIn")}
      </h1>
      <p className="mt-2 leading-6 text-[var(--text-muted)]">
        {t("signInDescription")}
      </p>

      {step === "email" ? (
        <form onSubmit={requestCode} className="mt-7 space-y-5">
          <label className="block text-sm font-medium text-slate-800" htmlFor="staff-email">
            {t("workEmail")}
            <input
              id="staff-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-[var(--border)] bg-white px-4 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="name@example.com"
            />
          </label>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            {t("codeExpiry")}
          </p>
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-lg bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-secondary)] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? t("loading") : t("sendCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-7 space-y-5">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
            {notice}
          </p>
          <label className="block text-sm font-medium text-slate-800" htmlFor="otp-code">
            {t("otpCode")}
            <input
              id="otp-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 min-h-14 w-full rounded-lg border border-[var(--border)] bg-white px-4 text-center font-mono text-2xl tracking-[0.35em] outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              placeholder="••••••"
            />
          </label>
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="min-h-12 w-full rounded-lg bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-secondary)] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? t("loading") : t("verifyCode")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
              setNotice("");
            }}
            className="min-h-11 w-full text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
          >
            {t("resendCode")}
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
          {error}
        </p>
      ) : null}

      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-primary)]"
      >
        <span aria-hidden="true" className="mr-2">←</span>{t("backHome")}
      </Link>
    </div>
  );
}
