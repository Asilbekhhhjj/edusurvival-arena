import { useEffect } from "react";
import { cn } from "../utils/cn";
import type { Zone } from "../types";
import { useStore } from "../store";

export function Card({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} className={cn("glass rounded-2xl relative", className)}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
      <div>
        {eyebrow && <div className="text-[10px] tracking-[0.35em] uppercase text-lime-400/80">{eyebrow}</div>}
        <h2 className="text-2xl md:text-3xl font-display font-black tracking-wide text-white mt-1">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, delta, tone = "cyan" }: { label: string; value: string; delta?: string; tone?: "cyan" | "lime" | "violet" | "red" }) {
  const tones: Record<string, string> = {
    cyan:   "from-cyan-400/20 to-cyan-500/5 text-cyan-300",
    lime:   "from-lime-400/20 to-lime-500/5 text-lime-300",
    violet: "from-violet-400/20 to-violet-500/5 text-violet-300",
    red:    "from-rose-400/20 to-rose-500/5 text-rose-300",
  };
  return (
    <Card className="p-5 overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", tones[tone])} />
      <div className="relative">
        <div className="text-xs text-white/50 tracking-wider uppercase">{label}</div>
        <div className="mt-2 flex items-end gap-2">
          <div className="font-display text-3xl font-black text-white">{value}</div>
          {delta && <div className={cn("text-xs font-semibold pb-1", tones[tone])}>{delta}</div>}
        </div>
      </div>
    </Card>
  );
}

export function Badge({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "lime" | "violet" | "red" | "amber" | "gray" }) {
  const map: Record<string, string> = {
    cyan:   "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
    lime:   "bg-lime-500/15 text-lime-300 border-lime-400/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-400/30",
    red:    "bg-rose-500/15 text-rose-300 border-rose-400/30",
    amber:  "bg-amber-500/15 text-amber-300 border-amber-400/30",
    gray:   "bg-white/5 text-white/60 border-white/10",
  };
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap", map[tone])}>{children}</span>;
}

export function ZoneChip({ zone }: { zone: Zone }) {
  if (zone === "red")    return <Badge tone="red">🔴 Qizil zona</Badge>;
  if (zone === "yellow") return <Badge tone="amber">🟡 Sariq zona</Badge>;
  return <Badge tone="lime">🟢 Yashil zona</Badge>;
}

export function ProgressBar({ value, max, showZones = false }: { value: number; max: number; showZones?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="relative">
      <div className="h-4 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
        {showZones && (
          <div className="absolute inset-0 flex">
            <div className="h-full" style={{ width: "50%", background: "rgba(244,63,94,0.10)" }} />
            <div className="h-full" style={{ width: "30%", background: "rgba(245,158,11,0.10)" }} />
            <div className="h-full" style={{ width: "20%", background: "rgba(163,230,53,0.10)" }} />
          </div>
        )}
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-lime-400 transition-all duration-700 relative"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-white/20 mix-blend-overlay animate-pulse" />
        </div>
        {showZones && (
          <>
            <div className="absolute top-0 bottom-0" style={{ left: "50%", width: "1px", background: "rgba(255,255,255,0.25)" }} />
            <div className="absolute top-0 bottom-0" style={{ left: "80%", width: "1px", background: "rgba(255,255,255,0.25)" }} />
          </>
        )}
      </div>
      {showZones && (
        <div className="flex justify-between text-[10px] mt-1.5 text-white/40 font-mono">
          <span>0</span><span>25 (yiqilish)</span><span>40 (yaxshi)</span><span>50 (a'lo)</span>
        </div>
      )}
    </div>
  );
}

export function Button({ children, tone = "primary", size = "md", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "danger" | "ghost" | "lime"; size?: "sm" | "md" | "lg" }) {
  const tones = {
    primary:   "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white",
    secondary: "bg-white/5 hover:bg-white/10 border border-white/10 text-white",
    danger:    "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white",
    ghost:     "text-white/70 hover:text-white hover:bg-white/5",
    lime:      "bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-black",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      {...rest}
      className={cn("rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed", tones[tone], sizes[size], className)}
    >{children}</button>
  );
}

export function Input({ label, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div>
      {label && <div className="text-[10px] tracking-widest text-white/40 uppercase mb-1">{label}</div>}
      <input
        {...rest}
        className={cn("w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50", rest.className)}
      />
    </div>
  );
}

export function Textarea({ label, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div>
      {label && <div className="text-[10px] tracking-widest text-white/40 uppercase mb-1">{label}</div>}
      <textarea
        {...rest}
        className={cn("w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50", rest.className)}
      />
    </div>
  );
}

export function Select({ label, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div>
      {label && <div className="text-[10px] tracking-widest text-white/40 uppercase mb-1">{label}</div>}
      <select
        {...rest}
        className={cn(
          "w-full px-3 py-2 rounded-lg bg-[#161925] border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-400/50 [&>option]:bg-[#161925] [&>option]:text-white", 
          rest.className
        )}
      >
        {children}
      </select>
    </div>
  );
}

export function Modal({ open, onClose, children, size = "md" }: { open: boolean; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={cn("w-full glass rounded-2xl p-6 relative", sizes[size])}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/50 hover:text-white text-xl w-8 h-8 grid place-items-center rounded hover:bg-white/10">×</button>
        {children}
      </div>
    </div>
  );
}

export function ToastLayer() {
  const toasts = useStore(s => s.toasts);
  const dismiss = useStore(s => s.dismissToast);
  const map: Record<string, string> = {
    success: "border-lime-400/50 bg-lime-500/10 text-lime-100",
    error:   "border-rose-400/50 bg-rose-500/10 text-rose-100",
    info:    "border-cyan-400/50 bg-cyan-500/10 text-cyan-100",
    warning: "border-amber-400/50 bg-amber-500/10 text-amber-100",
  };
  const icons: Record<string, string> = { success: "✓", error: "✕", info: "ℹ", warning: "⚠" };
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 w-80">
      {toasts.map(t => (
        <div key={t.id} className={cn("p-4 rounded-xl border backdrop-blur-lg cursor-pointer", map[t.tone])} onClick={() => dismiss(t.id)}>
          <div className="flex items-start gap-3">
            <div className="text-lg">{icons[t.tone]}</div>
            <div className="flex-1">
              <div className="font-semibold">{t.title}</div>
              {t.desc && <div className="text-xs opacity-80 mt-0.5">{t.desc}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function formatMoney(v: number) {
  return v.toLocaleString("en-US").replace(/,/g, " ") + " so'm";
}
export function timeAgo(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  return `${Math.floor(h/24)} kun`;
}
