"use client";

import { useState, type FormEvent } from "react";

export default function AdminLoginForm() {
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [masked, setMasked] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, d: (await r.json()) as { error?: string; step?: string; email?: string; mustChange?: boolean; restart?: boolean } };
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { ok, d } = await post("/api/admin/auth/login", { email, password });
      if (!ok) { setErr(d.error ?? "Sign-in failed."); return; }
      setMasked(d.email ?? ""); setCode(""); setStep("otp");
    } catch { setErr("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { ok, d } = await post("/api/admin/auth/verify-otp", { code });
      if (!ok) {
        setErr(d.error ?? "Verification failed.");
        if (d.restart) { setStep("password"); setPassword(""); }
        return;
      }
      window.location.assign(d.mustChange ? "/admin/change-password" : "/admin");
    } catch { setErr("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  const btn = "w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60";
  const error = err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>;

  if (step === "otp") {
    return (
      <form onSubmit={submitCode} className="relative w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-2xl" noValidate>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-600">Step 2 of 2</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Enter your code</h1>
          <p className="mt-1 text-sm text-slate-600">We sent a 6-digit code to {masked}. It expires in 5 minutes.</p>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Verification code
          <input className={`${field} text-center text-2xl tracking-[0.5em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required /></label>
        {error}
        <button type="submit" disabled={busy || code.length !== 6} className={btn}>{busy ? "Verifying…" : "Verify and sign in"}</button>
        <button type="button" onClick={() => { setStep("password"); setErr(""); }} className="w-full text-sm font-bold text-slate-600 hover:text-slate-900">Start again</button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="relative w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-2xl" noValidate>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-600">Machinery Tools Nepal</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Admin sign in</h1>
      </div>
      <label className="block text-sm font-semibold text-slate-700">Email
        <input className={field} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="block text-sm font-semibold text-slate-700">Password
        <div className="relative">
          <input className={`${field} pr-20`} type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-900">{show ? "Hide" : "Show"}</button>
        </div>
      </label>
      {error}
      <button type="submit" disabled={busy} className={btn}>{busy ? "Checking…" : "Continue"}</button>
    </form>
  );
}