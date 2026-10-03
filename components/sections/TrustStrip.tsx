import Reveal from "@/components/ui/Reveal";

const items = [
  { icon: "🚜", title: "Agri to Industrial", text: "Reapers, tillers, shellers, tools & parts" },
  { icon: "🔧", title: "Repair & Spares", text: "Genuine parts and workshop support" },
  { icon: "📍", title: "Pokhara Showroom", text: "Baglung Buspark — visit and see it live" },
  { icon: "💬", title: "Fast Replies", text: "WhatsApp, Viber or call — same day" },
];

export default function TrustStrip() {
  return (
    <section className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.08} className="bg-white p-6">
            <div className="text-3xl">{it.icon}</div>
            <h3 className="mt-3 font-extrabold text-slate-950">{it.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{it.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
