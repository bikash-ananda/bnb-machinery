"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { savePosition, usePosition } from "@/lib/ui/positions";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Makes a floating widget draggable (mouse + touch). It snaps to the left or right edge
 * and remembers its place. Pass the default `fixed ...` placement classes in className.
 */
export default function Draggable({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const saved = usePosition(id);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; w: number; h: number; moved: boolean } | null>(null);
  const suppress = useRef(false);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);

  const place = (e: PointerEvent<HTMLDivElement>, d: NonNullable<typeof drag.current>) => ({
    x: clamp(d.ox + e.clientX - d.sx, 8, window.innerWidth - d.w - 8),
    y: clamp(d.oy + e.clientY - d.sy, 8, window.innerHeight - d.h - 8),
  });

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, w: r.width, h: r.height, moved: false };
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
      d.moved = true;
      ref.current?.setPointerCapture(e.pointerId);
    }
    setLive(place(e, d));
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppress.current = true;
    setTimeout(() => { suppress.current = false; }, 0);
    const p = place(e, d);
    const x = p.x + d.w / 2 < window.innerWidth / 2 ? 8 : window.innerWidth - d.w - 8;
    savePosition(id, { x, y: p.y, w: d.w });
    setLive(null);
  }

  const style = live
    ? { left: live.x, top: live.y, right: "auto", bottom: "auto" }
    : saved
      ? { left: `min(${saved.x}px, calc(100vw - ${saved.w + 8}px))`, top: `min(${saved.y}px, calc(100vh - 72px))`, right: "auto", bottom: "auto" }
      : undefined;

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, touchAction: "none", cursor: live ? "grabbing" : undefined }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; setLive(null); }}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => { if (suppress.current) { e.preventDefault(); e.stopPropagation(); } }}
    >
      {children}
    </div>
  );
}