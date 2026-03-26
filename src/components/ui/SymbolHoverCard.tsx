import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getAssetMeta } from "../../lib/assets";

type Props = {
  symbol: string;
  children: ReactNode;
  as?: "div" | "span";
  className?: string;
};

const TOOLTIP_WIDTH = 260;
const VIEWPORT_GUTTER = 12;

export default function SymbolHoverCard({
  symbol,
  children,
  as = "span",
  className = "",
}: Props) {
  const triggerRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const meta = useMemo(() => getAssetMeta(symbol), [symbol]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const node = triggerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const maxLeft = Math.max(
      VIEWPORT_GUTTER,
      window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_GUTTER
    );

    setPosition({
      top: rect.bottom + 10,
      left: Math.min(Math.max(rect.left, VIEWPORT_GUTTER), maxLeft),
    });
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const syncPosition = () => updatePosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [open]);

  const handleOpen = () => {
    updatePosition();
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const tooltip = mounted && open
    ? createPortal(
        <div
          className="pointer-events-none fixed z-[80] w-[260px] rounded-xl border border-white/[0.1] bg-[#111118]/96 p-3 shadow-2xl backdrop-blur-md"
          style={{ top: position.top, left: position.left }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-emerald/20 bg-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald/80">
              {meta.symbol}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              {meta.assetClass}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">{meta.name}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{meta.focus}</p>
        </div>,
        document.body
      )
    : null;

  const title = `${meta.name} | ${meta.assetClass} | ${meta.focus}`;
  const baseClass = `${as === "span" ? "inline-flex" : "block"} ${className}`.trim();

  if (as === "div") {
    return (
      <>
        <div
          ref={(node) => {
            triggerRef.current = node;
          }}
          className={baseClass}
          title={title}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onFocus={handleOpen}
          onBlur={handleClose}
        >
          {children}
        </div>
        {tooltip}
      </>
    );
  }

  return (
    <>
      <span
        ref={(node) => {
          triggerRef.current = node;
        }}
        className={baseClass}
        title={title}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
