"use client";

import { useEffect, useState, type FormEvent } from "react";

type Status = "OPEN" | "NEEDS_HUMAN" | "RESOLVED" | "CLOSED";
type Conversation = {
  id: string;
  channel: string;
  language: string;
  status: Status;
  assignedTo: string | null;
  handoffReason: string | null;
  lastMessageAt: string;
  createdAt: string;
  messages: { id: string; role: string; content: string; language: string; createdAt: string }[];
};

const statusLabel: Record<Status, string> = { OPEN: "Open", NEEDS_HUMAN: "Needs staff", RESOLVED: "Resolved", CLOSED: "Closed" };
const dateTime = (value: string) => new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function SupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/support", { cache: "no-store" });
      if (!response.ok) throw new Error("Customer conversations could not be loaded.");
      const data = await response.json() as { conversations: Conversation[] };
      setConversations(data.conversations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Customer conversations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/support", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Customer conversations could not be loaded.");
        const data = await response.json() as { conversations: Conversation[] };
        if (active) setConversations(data.conversations);
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Customer conversations could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function update(conversation: Conversation, status: Status, assignToMe = false) {
    setSaving(conversation.id);
    setError("");
    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversation.id, status, assignToMe }),
      });
      if (!response.ok) throw new Error("The conversation could not be updated.");
      setConversations((items) => items.map((item) => item.id === conversation.id ? {
        ...item,
        status,
        assignedTo: assignToMe ? "You" : item.assignedTo,
        handoffReason: status === "NEEDS_HUMAN" ? item.handoffReason : null,
      } : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The conversation could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  async function reply(event: FormEvent<HTMLFormElement>, conversation: Conversation) {
    event.preventDefault();
    const content = (drafts[conversation.id] ?? "").trim();
    if (!content || saving) return;
    setSaving(conversation.id);
    setError("");
    try {
      const response = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversation.id, requestId: crypto.randomUUID(), content }),
      });
      const data = await response.json() as { message?: Conversation["messages"][number]; lastMessageAt?: string; error?: string };
      if (!response.ok) throw new Error(data.error === "conversation_closed" ? "This conversation is closed. Reopen it before replying." : "The reply could not be saved.");
      if (!data.message || !data.lastMessageAt) {
        await load();
        setDrafts((items) => ({ ...items, [conversation.id]: "" }));
        return;
      }
      setConversations((items) => items.map((item) => item.id === conversation.id ? {
        ...item,
        status: "OPEN",
        handoffReason: null,
        lastMessageAt: data.lastMessageAt!,
        messages: [...item.messages, data.message!].slice(-30),
      } : item));
      setDrafts((items) => ({ ...items, [conversation.id]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reply could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Customer care</p><h1 className="mt-1 text-2xl font-black text-slate-950">Support conversations</h1><p className="mt-1 text-sm text-slate-600">Review recent website chat transcripts and handle requests that need a person.</p></div>
        <button type="button" onClick={() => void load()} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading conversations…</p> : conversations.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">No recent conversations yet.</p> : (
        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <article key={conversation.id} className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${conversation.status === "NEEDS_HUMAN" ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${conversation.status === "NEEDS_HUMAN" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{statusLabel[conversation.status]}</span><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{conversation.channel} · {conversation.language}</span></div><p className="mt-2 text-xs text-slate-500">Last message {dateTime(conversation.lastMessageAt)}</p>{conversation.handoffReason && <p className="mt-2 text-sm font-semibold text-amber-900">{conversation.handoffReason}</p>}</div>
                <div className="flex flex-wrap items-center gap-2"><button type="button" disabled={saving === conversation.id || conversation.assignedTo !== null || conversation.status === "CLOSED"} onClick={() => void update(conversation, conversation.status, true)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">{conversation.assignedTo ? `Assigned: ${conversation.assignedTo}` : "Assign to me"}</button><label className="sr-only" htmlFor={`conversation-status-${conversation.id}`}>Conversation status</label><select id={`conversation-status-${conversation.id}`} value={conversation.status} disabled={saving === conversation.id || conversation.status === "CLOSED"} onChange={(event) => void update(conversation, event.target.value as Status)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"><option value="OPEN">Open</option><option value="NEEDS_HUMAN">Needs staff</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></div>
              </div>
              <ol className="mt-4 max-h-80 space-y-2 overflow-y-auto border-t border-slate-100 pt-4" aria-label="Conversation transcript">
                {conversation.messages.map((message) => <li key={message.id} className={`rounded-xl p-3 text-sm ${message.role === "USER" ? "bg-slate-50 text-slate-900" : message.role === "STAFF" ? "bg-blue-50 text-blue-950" : "bg-emerald-50 text-emerald-950"}`}><div className="mb-1 flex justify-between gap-2 text-[10px] font-bold uppercase tracking-wide opacity-70"><span>{message.role === "USER" ? "Customer" : message.role === "STAFF" ? "Staff" : "Assistant"}</span><time dateTime={message.createdAt}>{dateTime(message.createdAt)}</time></div><p className="whitespace-pre-wrap break-words">{message.content}</p></li>)}
              </ol>
              <form onSubmit={(event) => void reply(event, conversation)} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <label htmlFor={`reply-${conversation.id}`} className="text-xs font-bold text-slate-700">Reply in website chat</label>
                <textarea id={`reply-${conversation.id}`} value={drafts[conversation.id] ?? ""} onChange={(event) => setDrafts((items) => ({ ...items, [conversation.id]: event.target.value.slice(0, 2000) }))} rows={3} maxLength={2000} disabled={saving === conversation.id || conversation.status === "CLOSED"} placeholder="Write a short, helpful reply…" className="block min-h-24 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50" />
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-slate-500">The customer sees it when the chat is open or refreshed.</p><button type="submit" disabled={saving === conversation.id || conversation.status === "CLOSED" || !(drafts[conversation.id] ?? "").trim()} className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{saving === conversation.id ? "Sending…" : "Send reply"}</button></div>
              </form>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">Customer identity is not collected in this chat. Use the quotation form or ask the customer to contact the team directly if follow-up details are needed.</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
