"use client";

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Check, CircleAlert, Database, LoaderCircle, LockKeyhole, Plus, Send, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import type { AgentDefinition, AgentId } from "@/lib/ai/agents";
import type { AgentReport, ProviderStatus } from "@/lib/ai/types";

type Usage = { inputTokens: number | null; outputTokens: number | null; costUsdMicros: number | null; fallbackUsed: boolean; latencyMs: number };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; reports?: AgentReport[]; usage?: Usage };
type AgentCard = Pick<AgentDefinition, "id" | "name" | "description" | "prompts">;
type Props = { agents: AgentCard[]; provider: ProviderStatus };

function costLabel(cost: number) { return `$${(cost / 1_000_000).toFixed(6)}`; }

function ReportCard({ report }: { report: AgentReport }) {
  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
        <Database size={15} className="mt-0.5 shrink-0 text-emerald-700" />
        <div className="min-w-0">
          <h3 className="text-xs font-extrabold text-slate-800">{report.title}</h3>
          {report.period && <p className="mt-0.5 text-[11px] text-slate-500">{report.period}</p>}
        </div>
      </div>
      <div className="p-3">
        {report.metrics.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {report.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className="mt-1 break-words text-sm font-black text-slate-900">{metric.value}</p>
                {metric.detail && <p className="mt-0.5 text-[11px] text-slate-500">{metric.detail}</p>}
              </div>
            ))}
          </div>
        )}
        {report.table && report.table.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead><tr>{report.table.headings.map((heading) => <th key={heading} className="border-b border-slate-200 px-2 py-2 font-bold text-slate-500">{heading}</th>)}</tr></thead>
              <tbody>{report.table.rows.map((row, index) => <tr key={`${report.tool}-${index}`} className="odd:bg-slate-50/70">{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className="border-b border-slate-100 px-2 py-2 text-slate-700">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {report.notes?.map((note) => <p key={note} className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>)}
        <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[10px] text-slate-500">{report.status === "unavailable" ? <CircleAlert size={12} className="text-amber-700" /> : <Check size={12} className="text-emerald-700" />} {report.status === "unavailable" ? "Data not available" : "Source"}: {report.source}</p>
      </div>
    </section>
  );
}

export default function AIWorkbench({ agents, provider }: Props) {
  const [agentId, setAgentId] = useState<AgentId>(agents[0]?.id ?? "sales");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const agent = useMemo(() => agents.find((item) => item.id === agentId) ?? agents[0], [agents, agentId]);
  const enabled = provider.enabled && Boolean(agent);

  async function submit(event?: FormEvent, supplied?: string) {
    event?.preventDefault();
    const question = (supplied ?? input).trim();
    if (!question || busy || !agent || !enabled) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, messages: next.filter((message) => message.role === "user").slice(-4).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await response.json() as { answer?: string; reports?: AgentReport[]; usage?: Usage; error?: string };
      if (!response.ok) {
        const messages: Record<string, string> = {
          rate_limited: "You’ve reached the short-term request limit. Please wait a moment and try again.",
          ai_not_configured: "An AI provider is not configured yet. Ask the system administrator to add the server-side AI settings.",
          not_allowed: "Your role does not have access to this agent.",
        };
        throw new Error(messages[data.error ?? ""] ?? "The assistant could not complete this request. Please try again.");
      }
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: data.answer ?? "No response was returned.", reports: data.reports ?? [], usage: data.usage }]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The assistant could not complete this request.";
      setError(message);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: message }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 0);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  function switchAgent(value: string) {
    setAgentId(value as AgentId);
    setMessages([]);
    setError("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-400 text-slate-950"><Bot size={23} /></span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">BNB Intelligence</p>
            <h1 className="mt-1 text-2xl font-black">AI business assistant</h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">Ask a business question. The assistant checks approved live records and shows the source figures alongside its explanation.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          {provider.enabled ? <><span className="size-2 rounded-full bg-emerald-400" /><span className="font-bold">{provider.provider} · {provider.model}</span></> : <><CircleAlert size={15} className="text-amber-300" /><span className="font-bold text-amber-100">AI provider not configured</span></>}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><Sparkles size={17} className="text-amber-600" /><h2 className="text-sm font-black">Choose an agent</h2></div>
            <label className="sr-only" htmlFor="ai-agent">Agent</label>
            <select id="ai-agent" value={agent?.id ?? ""} disabled={busy} onChange={(event) => switchAgent(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
              {agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-500">{agent?.description}</p>
            <button type="button" onClick={() => { setMessages([]); setInput(""); setError(""); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-amber-400 hover:bg-amber-50"><Plus size={14} /> New conversation</button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Try asking</h2>
            <div className="mt-2 space-y-2">
              {agent?.prompts.map((prompt) => <button type="button" key={prompt} disabled={!enabled || busy} onClick={() => void submit(undefined, prompt)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold leading-5 text-slate-700 transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">{prompt}</button>)}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-900"><ShieldCheck size={16} /><h2 className="text-xs font-black">Read-only and permission checked</h2></div>
            <p className="mt-2 text-xs leading-5 text-emerald-900/80">This assistant can read only the records allowed for your account. It cannot change stock, prices, orders or accounting entries. Every request is audited without saving the chat text.</p>
          </section>
        </aside>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800"><Sparkles size={16} /></span><div><p className="text-sm font-extrabold">{agent?.name ?? "Assistant"}</p><p className="text-[11px] text-slate-500">{messages.length ? "Conversation held in this browser session" : "New conversation"}</p></div></div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><LockKeyhole size={12} /> Private</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
            {messages.length === 0 && (
              <div className="mx-auto mt-10 max-w-md text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-950 text-amber-300"><Bot size={27} /></span>
                <h2 className="mt-4 text-lg font-black text-slate-900">What would you like to know?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">I’ll use live B&B Machinery records I’m allowed to access and show you the figures and source.</p>
                {!provider.enabled && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-5 text-amber-900">Add <code>AI_PROVIDER</code>, <code>AI_MODEL</code> and the matching API key to the server environment, then restart the app. Do not add AI credentials to a <code>NEXT_PUBLIC_</code> variable.</p>}
              </div>
            )}
            {messages.map((message) => (
              <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[94%] sm:max-w-[88%] ${message.role === "user" ? "rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-white" : "w-full rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm"}`}>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  {message.role === "assistant" && message.reports?.map((report, index) => <ReportCard key={`${message.id}-${report.tool}-${index}`} report={report} />)}
                  {message.usage && <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-400"><span>{message.usage.inputTokens ?? "—"} in · {message.usage.outputTokens ?? "—"} out tokens</span><span>{message.usage.latencyMs} ms</span>{message.usage.fallbackUsed && <span>Fallback provider used</span>}{message.usage.costUsdMicros !== null && <span className="flex items-center gap-1"><WalletCards size={11} /> {costLabel(message.usage.costUsdMicros)}</span>}</p>}
                </div>
              </article>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><LoaderCircle size={15} className="animate-spin" /> Checking authorized data and preparing a response…</div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={(event) => void submit(event)} className="border-t border-slate-200 bg-white p-3 sm:p-4">
            {error && <p role="alert" className="mb-2 text-xs font-semibold text-red-700">{error}</p>}
            <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100">
              <label htmlFor="ai-question" className="sr-only">Ask the selected AI agent</label>
              <textarea id="ai-question" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} disabled={!enabled || busy} maxLength={800} rows={2} placeholder={enabled ? "Ask about sales, stock, purchasing or accounting…" : "Configure an AI provider to start."} className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-2 py-1.5 text-sm leading-5 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed" />
              <button type="submit" disabled={!enabled || busy || !input.trim()} aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-400 text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">Figures come from live records. Verify consequential decisions in the source module.</p>
          </form>
        </section>
      </div>
    </div>
  );
}