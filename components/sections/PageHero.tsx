import L from "@/components/i18n/L";
import MotionBackdrop, { type BackdropVariant } from "@/components/ui/MotionBackdrop";
import { siteImages } from "@/data/siteImages";

export type HeroPage = keyof typeof siteImages.hero;
type Txt = string | { en: string; ne: string };
const show = (v: Txt) => (typeof v === "string" ? v : <L en={v.en} ne={v.ne} />);

export default function PageHero({
  eyebrow, title, text, variant = "gears", page,
}: { eyebrow: Txt; title: Txt; text?: Txt; variant?: BackdropVariant; page?: HeroPage }) {
  const tall = variant === "farm" || variant === "workshop" || variant === "road";
  const photo = page ? siteImages.hero[page] : undefined;
  return (
    <section className="relative overflow-hidden bg-[#07111f] text-white">
      {photo && (
        <>
          <div role="img" aria-label={photo.alt} className="kenburns absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${photo.src}")` }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07111f]/95 via-[#07111f]/75 to-[#07111f]/40" />
        </>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(245,158,11,0.18),transparent_40%)]" />
      <div className={photo ? "opacity-60" : ""}><MotionBackdrop variant={variant} /></div>
      <div className={`relative mx-auto max-w-7xl px-6 pt-20 lg:px-8 lg:pt-28 ${tall ? "pb-36 lg:pb-44" : "pb-20 lg:pb-28"}`}>
        <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-400">{show(eyebrow)}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">{show(title)}</h1>
        {text && <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{show(text)}</p>}
      </div>
    </section>
  );
}