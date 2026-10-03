"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Namaste! 👋 I’m the B & B Machinery Assistant. I can help you find machinery or parts, understand our services, request a quotation, or connect you with our team.",
  },
];

const quickActions = [
  "Find machinery",
  "Find spare parts",
  "Our services",
  "Request a quotation",
  "Contact B & B Machinery",
];

function getAssistantResponse(message: string) {
  const text = message.toLowerCase();

  if (
    text.includes("hello") ||
    text.includes("hi") ||
    text.includes("namaste")
  ) {
    return "Namaste! How can I help you today? You can ask about machinery, spare parts, services, quotations, or contacting our team.";
  }

  if (
    text.includes("machine") ||
    text.includes("machinery") ||
    text.includes("equipment")
  ) {
    return "I can help you identify suitable machinery. Please tell me what you need the machine for, your application, and any important requirements.";
  }

  if (
    text.includes("part") ||
    text.includes("spare") ||
    text.includes("replacement")
  ) {
    return "For a spare-parts inquiry, please provide the machine brand, model, part number if available, and a photo of the required part.";
  }

  if (
    text.includes("service") ||
    text.includes("repair") ||
    text.includes("maintenance") ||
    text.includes("installation")
  ) {
    return "B & B Machinery provides machinery-related technical support including repair, maintenance, installation and technical consultation.";
  }

  if (
    text.includes("quote") ||
    text.includes("quotation") ||
    text.includes("price") ||
    text.includes("cost")
  ) {
    return "I can help start a quotation request. Please provide the machinery or part name, model or part number if available, quantity, and your contact details. You can also contact our team at +977 9856088600.";
  }

  if (
    text.includes("contact") ||
    text.includes("phone") ||
    text.includes("whatsapp") ||
    text.includes("viber")
  ) {
    return "You can contact B & B Machinery at +977 9856088600. WhatsApp and Viber are also available on this number.";
  }

  if (
    text.includes("location") ||
    text.includes("pokhara") ||
    text.includes("address")
  ) {
    return "B & B Machinery is located at Baglung Buspark, Pokhara, Kaski, Gandaki Province, Nepal.";
  }

  return "I can help with machinery, machinery parts, repair, maintenance, installation, technical consultation and quotation requests.";
}

export default function Chatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  if (pathname.startsWith("/staff")) return null;

  function sendMessage(message: string) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setMessages((current) => {
      const nextId =
        current.length > 0
          ? Math.max(...current.map((item) => item.id)) + 1
          : 1;

      const userMessage: Message = {
        id: nextId,
        role: "user",
        content: trimmedMessage,
      };

      const assistantMessage: Message = {
        id: nextId + 1,
        role: "assistant",
        content: getAssistantResponse(trimmedMessage),
      };

      return [...current, userMessage, assistantMessage];
    });

    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {open && (
        <section
          aria-label="B & B Machinery AI Assistant"
          className="fixed bottom-24 right-4 z-[60] flex h-[min(650px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-[var(--brand-primary)] px-5 py-4 text-white">
            <div>
              <p className="text-sm font-semibold">B & B Machinery</p>
              <p className="text-xs text-slate-300">
                AI Customer Assistant
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg px-2 py-1 text-xl text-slate-300 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--surface)] p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "rounded-br-md bg-[var(--brand-primary)] text-white"
                      : "rounded-bl-md border border-[var(--border)] bg-white text-slate-700"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--border)] bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => sendMessage(action)}
                  className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-[var(--brand-accent)] hover:bg-[var(--surface)]"
                >
                  {action}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about machinery..."
                aria-label="Message"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)]"
              />

              <button
                type="submit"
                className="rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Send
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={
          open
            ? "Close B & B Machinery Assistant"
            : "Open B & B Machinery Assistant"
        }
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xl text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? "×" : "AI"}
      </button>
    </>
  );
}
