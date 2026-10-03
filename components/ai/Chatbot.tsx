"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { greeting, hasDevanagari, respond, speakable, type Flow, type Lang, type Reply } from "@/lib/chat/brain";

type Message = { id: number; role: "assistant" | "user"; reply?: Reply; content?: string };

type RecResult = { isFinal: boolean; 0: { transcript: string } };
type RecEvent = { resultIndex: number; results: ArrayLike<RecResult> };
type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;

function getSR(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
const noopSub = () => () => {};
const T = (lang: Lang, en: string, ne: string) => (lang === "ne" ? ne : en);

const STORE = "bnb-chat-v3";
const TEASER = "bnb-chat-teaser";

export default function Chatbot() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const lang: Lang = language === "ne" ? "ne" : "en";

  const micOk = useSyncExternalStore(noopSub, () => getSR() !== null, () => false);
  const ttsOk = useSyncExternalStore(noopSub, () => "speechSynthesis" in window, () => false);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [saved] = useState<{ messages: Message[]; flow: Flow } | null>(() => {
    try {
      const raw = typeof window === "undefined" ? null : sessionStorage.getItem(STORE);
      return raw ? (JSON.parse(raw) as { messages: Message[]; flow: Flow }) : null;
    } catch { return null; }
  });
  const [messages, setMessages] = useState<Message[]>(
    () => saved?.messages ?? [{ id: 0, role: "assistant", reply: greeting(lang) }],
  );
  const [flow, setFlow] = useState<Flow>(saved?.flow ?? null);
  const [typing, setTyping] = useState(false);
  const [teaser, setTeaser] = useState(false);

  // voice
  const [speakOn, setSpeakOn] = useState(false);
  const [call, setCall] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "speaking" | "thinking">("idle");
  const [interim, setInterim] = useState("");
  const [note, setNote] = useState("");

  const idRef = useRef(Math.max(0, ...(saved?.messages ?? []).map((m) => m.id)) + 1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recRef = useRef<Rec | null>(null);
  const speechId = useRef(0);
  const noSpeech = useRef(0);
  const callRef = useRef(false);
  const speakRef = useRef(false);
  const langRef = useRef<Lang>(lang);
  const sendRef = useRef<(t: string) => void>(() => {});

  useEffect(() => {
    langRef.current = lang;
    speakRef.current = speakOn;
    sendRef.current = send;
  });

  useEffect(() => {
    if (messages.length === 0) return;
    try { sessionStorage.setItem(STORE, JSON.stringify({ messages, flow })); } catch {}
  }, [messages, flow]);

  useEffect(() => {
    try { if (sessionStorage.getItem(TEASER)) return; } catch {}
    const id = setTimeout(() => setTeaser(true), 8000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, typing, open, interim]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeChat();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    const r = recRef.current; recRef.current = null;
    try { r?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  /* ---------- voice helpers ---------- */
  function speak(text: string, l: Lang, onDone?: () => void) {
    if (!ttsOk || !text) { onDone?.(); return; }
    const synth = window.speechSynthesis;
    const myId = ++speechId.current;
    synth.cancel();
    const voices = synth.getVoices();
    const prefs = l === "ne" ? ["ne", "hi"] : ["en-in", "en-us", "en-gb", "en"];
    let voice: SpeechSynthesisVoice | undefined;
    for (const p of prefs) {
      voice = voices.find((v) => v.lang.toLowerCase().replace("_", "-").startsWith(p));
      if (voice) break;
    }
    if (l === "ne" && voices.length > 0 && !voice) {
      setNote("यो उपकरणमा नेपाली आवाज छैन, त्यसैले उत्तर लेखिएर मात्र देखिन्छ। (Android Chrome मा वा Windows Settings > Speech मा नेपाली आवाज थप्नुहोस्।)");
      onDone?.();
      return;
    }
    if (l === "ne" && voice && !voice.lang.toLowerCase().startsWith("ne"))
      setNote("नेपाली आवाज भेटिएन; हिन्दी आवाज प्रयोग भएको छ।");
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = l === "ne" ? "ne-NP" : "en-US"; }
    u.rate = 0.95;
    u.onstart = () => { if (myId === speechId.current) setStatus("speaking"); };
    const done = () => {
      if (myId !== speechId.current) return;
      setStatus("idle");
      onDone?.();
    };
    u.onend = done;
    u.onerror = done;
    synth.speak(u);
  }

  function endCall() {
    callRef.current = false;
    setCall(false);
    const r = recRef.current; recRef.current = null;
    try { r?.abort(); } catch {}
    speechId.current++;
    try { window.speechSynthesis?.cancel(); } catch {}
    setStatus("idle");
    setInterim("");
  }

  function startListening() {
    const SR = getSR();
    if (!SR) { setNote(T(langRef.current, "Voice input needs Chrome or Edge.", "आवाजबाट सोध्न Chrome वा Edge चाहिन्छ।")); return; }
    const old = recRef.current; recRef.current = null;
    try { old?.abort(); } catch {}
    speechId.current++;
    try { window.speechSynthesis?.cancel(); } catch {}

    const rec = new SR();
    rec.lang = langRef.current === "ne" ? "ne-NP" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else partial += r[0].transcript;
      }
      setInterim(partial || finalText);
    };
    rec.onerror = (e) => {
      if (recRef.current !== rec) return;
      const l = langRef.current;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setNote(T(l, "Microphone is blocked. Allow microphone access in the browser address bar and try again.", "माइक्रोफोन बन्द छ। ब्राउजरको एड्रेस बारमा माइक्रोफोन अनुमति दिएर फेरि प्रयास गर्नुहोस्।"));
        endCall();
      } else if (e.error === "language-not-supported") {
        setNote(T(l, "This browser does not support voice input in this language.", "यो ब्राउजरले यो भाषामा आवाज पहिचान गर्दैन।"));
        endCall();
      }
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      setInterim("");
      const text = finalText.trim();
      if (text) {
        noSpeech.current = 0;
        setStatus("thinking");
        sendRef.current(text);
      } else if (callRef.current) {
        noSpeech.current += 1;
        if (noSpeech.current >= 3) {
          setNote(T(langRef.current, "I could not hear you, so the voice call ended.", "आवाज सुनिएन, त्यसैले भ्वाइस कल समाप्त भयो।"));
          endCall();
        } else {
          setTimeout(() => { if (callRef.current) startListening(); }, 300);
        }
      } else {
        setStatus("idle");
      }
    };
    recRef.current = rec;
    setStatus("listening");
    try { rec.start(); } catch { setStatus("idle"); }
  }

  function startCall() {
    if (!micOk) { setNote(T(lang, "Voice call works in Chrome or Edge on desktop and Android. iPhone Safari may not support it.", "भ्वाइस कल Chrome वा Edge मा चल्छ।")); return; }
    setNote("");
    callRef.current = true; speakRef.current = true; noSpeech.current = 0;
    setCall(true); setSpeakOn(true);
    speak(T(lang, "Hello, I am listening. How can I help you?", "नमस्ते, म सुन्दैछु। तपाईंलाई कसरी सहयोग गरूँ?"), lang, () => { if (callRef.current) startListening(); });
  }

  function listenOnce() {
    if (!micOk) { setNote(T(lang, "Voice input needs Chrome or Edge.", "आवाजबाट सोध्न Chrome वा Edge चाहिन्छ।")); return; }
    setNote("");
    if (status === "listening") {
      const r = recRef.current; recRef.current = null;
      try { r?.abort(); } catch {}
      setStatus("idle"); setInterim("");
      return;
    }
    startListening();
  }

  function toggleSpeak() {
    const next = !speakOn;
    setSpeakOn(next);
    speakRef.current = next;
    if (!next) { speechId.current++; try { window.speechSynthesis?.cancel(); } catch {} setStatus("idle"); }
  }

  /* ---------- chat ---------- */
  function afterReply(reply: Reply, l: Lang) {
    if (speakRef.current || callRef.current) {
      speak(speakable(reply), l, () => { if (callRef.current) startListening(); });
    } else if (callRef.current) {
      startListening();
    } else {
      setStatus("idle");
    }
  }

  function send(text: string) {
    const msg = text.trim().slice(0, 300);
    if (!msg || typing) return;
    const replyLang: Lang = hasDevanagari(msg) ? "ne" : lang;
    const userMsg: Message = { id: idRef.current++, role: "user", content: msg };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    const result = respond(msg, flow, replyLang);
    timer.current = setTimeout(() => {
      setFlow(result.flow);
      setMessages((m) => [...m, { id: idRef.current++, role: "assistant", reply: result.reply }]);
      setTyping(false);
      afterReply(result.reply, replyLang);
    }, 450);
  }

  function closeChat() {
    endCall();
    setOpen(false);
  }

  function toggle() {
    if (open) { closeChat(); } else { setOpen(true); }
    setTeaser(false);
    try { sessionStorage.setItem(TEASER, "1"); } catch {}
  }

  function reset() {
    endCall();
    setFlow(null);
    setTyping(false);
    setMessages([{ id: idRef.current++, role: "assistant", reply: greeting(lang) }]);
  }

  if (pathname.startsWith("/staff")) return null;

  const last = messages[messages.length - 1];
  const chips = !typing && last?.role === "assistant" ? last.reply?.chips : undefined;
  const linkCls = "inline-flex min-h-9 items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-100";
  const hdrBtn = "rounded-lg px-2 py-1 text-lg text-slate-300 hover:bg-white/10 hover:text-white";
  const statusText =
    status === "listening" ? T(lang, "Listening… speak now", "सुन्दैछु… बोल्नुहोस्")
    : status === "speaking" ? T(lang, "Speaking…", "बोल्दैछु…")
    : status === "thinking" ? T(lang, "Thinking…", "सोच्दैछु…")
    : T(lang, "Voice call connected", "भ्वाइस कल जोडिएको छ");

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="B & B Machinery assistant"
          className="fixed bottom-32 right-4 z-[60] flex h-[min(640px,calc(100vh-9rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl sm:bottom-24"
        >
          <div className="flex items-center justify-between gap-2 bg-[var(--brand-primary)] px-3 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">
                B&B
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--brand-primary)] bg-emerald-400" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">B & B {T(lang, "Assistant", "सहायक")}</p>
                <p className="truncate text-[11px] text-slate-300">{T(lang, "Replies instantly", "तुरुन्त जवाफ")}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <div className="mr-1 flex overflow-hidden rounded-full border border-white/25 text-[11px] font-bold" role="group" aria-label="Language">
                <button type="button" onClick={() => setLanguage("en")} aria-pressed={lang === "en"} className={`px-2 py-1 ${lang === "en" ? "bg-amber-400 text-slate-950" : "text-slate-200"}`}>EN</button>
                <button type="button" onClick={() => setLanguage("ne")} aria-pressed={lang === "ne"} className={`px-2 py-1 ${lang === "ne" ? "bg-amber-400 text-slate-950" : "text-slate-200"}`}>{"\u0928\u0947"}</button>
              </div>
              {ttsOk && (
                <button type="button" onClick={toggleSpeak} aria-pressed={speakOn} title={T(lang, "Read answers aloud", "उत्तर सुनाउनुहोस्")} aria-label={T(lang, "Read answers aloud", "उत्तर सुनाउनुहोस्")} className={hdrBtn}>
                  {speakOn ? "\u{1F50A}" : "\u{1F507}"}
                </button>
              )}
              {micOk && ttsOk && (
                <button type="button" onClick={call ? endCall : startCall} title={T(lang, "Voice call", "भ्वाइस कल")} aria-label={call ? T(lang, "End voice call", "भ्वाइस कल काट्नुहोस्") : T(lang, "Start voice call", "भ्वाइस कल सुरु गर्नुहोस्")} className={`${hdrBtn} ${call ? "bg-red-600 text-white hover:bg-red-700" : ""}`}>
                  {"\u{1F4DE}"}
                </button>
              )}
              <button type="button" onClick={reset} aria-label="Restart chat" title="Restart" className={hdrBtn}>{"\u21BA"}</button>
              <button type="button" onClick={closeChat} aria-label="Close chat" className={`${hdrBtn} text-xl`}>×</button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--surface)] p-4" aria-live="polite">
            {note && (
              <div className="flex items-start justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-slate-800">
                <span>{note}</span>
                <button type="button" onClick={() => setNote("")} aria-label="Dismiss" className="font-bold">×</button>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-6 ${m.role === "user" ? "rounded-br-md bg-[var(--brand-primary)] text-white" : "rounded-bl-md border border-[var(--border)] bg-white text-slate-800"}`}>
                  {m.content ?? m.reply?.text}
                  {m.reply?.links && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.reply.links.map((l) =>
                        l.external ? (
                          <a key={l.label} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={linkCls}>{l.label}</a>
                        ) : (
                          <Link key={l.label} href={l.href} onClick={closeChat} className={linkCls}>{l.label}</Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {interim && (
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md border border-dashed border-slate-400 bg-white px-4 py-3 text-sm italic text-slate-500">{interim}</div>
              </div>
            )}
            {typing && (
              <div className="flex justify-start" aria-label="Assistant is typing">
                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-[var(--border)] bg-white px-4 py-3">
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--border)] bg-white p-3">
            {call && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                <span className="flex items-center gap-2 font-semibold text-emerald-800">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                  {statusText}
                </span>
                <button type="button" onClick={endCall} className="rounded-full bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700">{T(lang, "Hang up", "काट्नुहोस्")}</button>
              </div>
            )}
            {chips && !call && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => send(c)} className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[var(--brand-accent)] hover:bg-amber-50">{c}</button>
                ))}
              </div>
            )}
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }} className="flex gap-2">
              {micOk && (
                <button type="button" onClick={listenOnce} aria-pressed={status === "listening" && !call} aria-label={T(lang, "Speak your question", "बोलेर सोध्नुहोस्")} title={T(lang, "Speak your question", "बोलेर सोध्नुहोस्")}
                  className={`rounded-lg border px-3 py-2.5 text-base ${status === "listening" && !call ? "animate-pulse border-red-500 bg-red-50" : "border-[var(--border)] hover:bg-amber-50"}`}>
                  {"\u{1F3A4}"}
                </button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={300}
                placeholder={flow ? T(lang, "Type your answer…", "यहाँ लेख्नुहोस्…") : T(lang, "Ask about machines, parts, price…", "मेसिन, पार्ट, मूल्य सोध्नुहोस्…")}
                aria-label="Message"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)]"
              />
              <button type="submit" disabled={typing || !input.trim()} className="rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50">
                {T(lang, "Send", "पठाउनु")}
              </button>
            </form>
          </div>
        </section>
      )}

      {teaser && !open && (
        <button type="button" onClick={toggle} className="fixed bottom-32 right-4 z-[60] max-w-[220px] rounded-2xl rounded-br-sm border border-[var(--border)] bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-xl sm:bottom-24">
          {T(lang, "Need a machine or part? Ask us 👋", "मेसिन वा पार्ट चाहिएको छ? सोध्नुहोस् 👋")}
        </button>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-16 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)] text-2xl text-white shadow-lg transition-transform hover:scale-105 sm:bottom-5 sm:right-5"
      >
        {open ? "×" : "\u{1F4AC}"}
      </button>
    </>
  );
}