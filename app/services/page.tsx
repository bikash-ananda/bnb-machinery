export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
          What We Do
        </p>

        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
          Our Services
        </h1>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <h2 className="text-xl font-bold">Machinery</h2>
            <p className="mt-3 text-slate-400">
              Machinery solutions for businesses, workshops and industries.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <h2 className="text-xl font-bold">Parts</h2>
            <p className="mt-3 text-slate-400">
              Machinery parts and components for maintenance and replacement.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <h2 className="text-xl font-bold">Technical Support</h2>
            <p className="mt-3 text-slate-400">
              Technical assistance, maintenance and machinery support.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}