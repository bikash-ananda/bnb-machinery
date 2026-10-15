"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Boxes, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Mail, Play, RefreshCw, ShoppingCart, Users, Workflow } from "lucide-react";

type Rule = { code: string; area: string; name: string; description: string; trigger: string; enabled: boolean };
type Metrics = {
  pendingEvents: number; failedEvents: number; pendingEmails: number; failedEmails: number; blockedEmails: number;
  lastRun: { at: string; status: string; detail: string | null } | null;
};
type ActivityData = {
  events: { id: string; eventType: string; aggregateType: string; status: string; attempts: number; createdAt: string }[];
  messages: { id: string; kind: string; toAddress: string; subject: string | null; status: string; attempts: number; createdAt: string }[];
};

const areaIcon: Record<string, typeof ShoppingCart> = {
  Commerce: ShoppingCart, Finance: CircleDollarSign, Inventory: Boxes, Customers: Users, Operations: Workflow,
};

function when(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "OK" || status === "SENT" || status === "PROCESSED"
    ? "bg-emerald-50 text-emerald-700"
    : status === "PENDING" || status === "PROCESSING" || status === "SENDING"
      ? "bg-amber-50 text-amber-800"
      : status === "BLOCKED"
        ? "bg-slate-100 text-slate-700"
        : "bg-rose-50 text-rose-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

export default function AutomationConsole({ databaseReady, rules: initialRules, metrics, activity: initialActivity }: {
  databaseReady: boolean; rules: Rule[]; metrics: Metrics | null; activity: ActivityData;
}) {
  const [rules, setRules] = useState(initialRules);
  const [activity, setActivity] = useState(initialActivity);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  async function action(payload: Record<string, unknown>) {
    setBusy(String(payload.code ?? payload.action ?? "action"));
    setNotice("");
    try {
      const response = await fetch("/api/admin/automation", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string; rule?: { code: string; enabled: boolean }; result?: Record<string, unknown> };
      if (!response.ok) throw new Error(result.error || "The action could not be completed.");
      if (result.rule) setRules((current) => current.map((rule) => rule.code === result.rule?.code ? { ...rule, enabled: result.rule.enabled } : rule));
      if (payload.action === "run") {
        setNotice("Automation cycle completed. Queued work and email delivery status have been refreshed.");
        window.setTimeout(() => window.location.reload(), 900);
      } else if (payload.action === "retry_failed") {
        setNotice("Failed items were returned to the queue for retry.");
        window.location.reload();
      } else {
        setNotice("Workflow updated.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  const active = rules.filter((rule) => rule.enabled).length;
  const attention = (metrics?.failedEvents ?? 0) + (metrics?.failedEmails ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
              <Workflow size={14} /> Commerce operations
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Automation center</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">Keep orders moving, follow up with customers and catch stock or payment issues early. Each workflow is monitored and safe to retry.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={!databaseReady || !!busy} onClick={() => void action({ action: "run" })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "run" ? <RefreshCw size={17} className="animate-spin" /> : <Play size={17} />} Run cycle now
            </button>
            {attention > 0 && <button type="button" disabled={!databaseReady || !!busy} onClick={() => void action({ action: "retry_failed" })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50">
              <RefreshCw size={16} /> Retry failed items
            </button>}
          </div>
        </div>
        <p className="mt-5 text-xs text-slate-400">A manual cycle can send emails that are already queued. Workflow switches below control future messages.</p>
      </section>

      {notice && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">{notice}</div>}

      {!databaseReady ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0" size={20} /><div><b>Automation storage is not ready.</b><p className="mt-1">Set the server-side DATABASE_URL and apply the Drizzle migrations. This page will show queue health after the automation tables are available.</p></div></div>
      </section> : <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Workflow} label="Active workflows" value={active + " / " + rules.length} detail="Switches are applied to new events" />
          <Metric icon={Activity} label="Events waiting" value={String(metrics?.pendingEvents ?? 0)} detail={(metrics?.failedEvents ?? 0) + " failed event(s)"} />
          <Metric icon={Mail} label="Email queue" value={String(metrics?.pendingEmails ?? 0)} detail={(metrics?.blockedEmails ?? 0) + " waiting for email setup"} />
          <Metric icon={Clock3} label="Last cycle" value={metrics?.lastRun ? metrics.lastRun.status : "Not run yet"} detail={metrics?.lastRun ? when(metrics.lastRun.at) : "The scheduler runs every minute"} />
        </section>

        {metrics?.blockedEmails ? <section className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <Mail className="mt-0.5 shrink-0" size={19} /><p><b>Email delivery is paused.</b> {metrics.blockedEmails} message(s) are saved safely. Configure RESEND_API_KEY and AUTOMATION_FROM_EMAIL; the scheduler will resume them automatically.</p>
        </section> : null}

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Workflow library</p><h2 className="mt-1 text-xl font-black text-slate-950">Choose what runs automatically</h2></div>
            <span className="text-xs font-semibold text-slate-500">Prebuilt, audited business workflows</span>
          </div>
          {rules.length ? <div className="grid gap-4 lg:grid-cols-2">
            {rules.map((rule) => {
              const Icon = areaIcon[rule.area] ?? Workflow;
              return <article key={rule.code} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${rule.enabled ? "border-slate-200 hover:border-amber-300" : "border-slate-200 opacity-75"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><Icon size={21} /></span>
                    <div><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{rule.area} · {rule.trigger.replaceAll("_", " ")}</span><h3 className="mt-1 text-base font-black text-slate-950">{rule.name}</h3><p className="mt-1.5 text-sm leading-5 text-slate-600">{rule.description}</p></div>
                  </div>
                  <button type="button" role="switch" aria-checked={rule.enabled} aria-label={(rule.enabled ? "Pause " : "Enable ") + rule.name}
                    disabled={!!busy} onClick={() => void action({ action: "toggle", code: rule.code, enabled: !rule.enabled })}
                    className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${rule.enabled ? "bg-emerald-600" : "bg-slate-300"} disabled:cursor-wait`}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${rule.enabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-500">{rule.enabled ? "Ready for matching events" : "Paused · no new messages will be created"}</span>
                  <StatusPill status={rule.enabled ? "ON" : "OFF"} />
                </div>
              </article>;
            })}
          </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No workflows found. Apply the automation seed migration to load the starter library.</div>}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ActivityPanel title="Recent business events" icon={CalendarClock} empty="New orders, payments and stock changes will appear here." rows={activity.events.map((event) => ({ id: event.id, title: event.eventType.replaceAll("_", " ").toLowerCase(), subtitle: event.aggregateType + " · " + when(event.createdAt), status: event.status, attempts: event.attempts }))} />
          <ActivityPanel title="Recent customer messages" icon={Mail} empty="Customer and staff notifications will appear after an event is processed." rows={activity.messages.map((message) => ({ id: message.id, title: message.subject || message.kind.replaceAll("_", " "), subtitle: message.toAddress + " · " + when(message.createdAt), status: message.status, attempts: message.attempts }))} />
        </section>

        <p className="flex items-center gap-2 text-xs leading-5 text-slate-500"><CheckCircle2 size={15} className="shrink-0 text-emerald-700" />Order, payment and stock events are recorded with their source transaction. Scheduled work is deduplicated, and email sends use retryable delivery records.</p>
      </>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500">{label}</p><Icon size={17} className="text-amber-700" /></div><p className="mt-2 text-2xl font-black text-slate-950">{value}</p><p className="mt-1 truncate text-xs text-slate-500">{detail}</p></div>;
}

function ActivityPanel({ title, icon: Icon, empty, rows }: { title: string; icon: typeof Activity; empty: string; rows: { id: string; title: string; subtitle: string; status: string; attempts: number }[] }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4"><Icon size={18} className="text-amber-700" /><h2 className="font-black text-slate-950">{title}</h2></div>
    {rows.length ? <ul className="divide-y divide-slate-100">{rows.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0"><p className="truncate text-sm font-bold capitalize text-slate-900">{row.title}</p><p className="mt-1 truncate text-xs text-slate-500">{row.subtitle}{row.attempts ? " · " + row.attempts + " attempt(s)" : ""}</p></div><StatusPill status={row.status} />
    </li>)}</ul> : <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><AlertTriangle size={16} />{empty}</div>}
  </section>;
}
