import type { GameMode } from "../types";
import { Input, Textarea, Select, Badge, Button } from "../components/UI";
import { GAME_MODE_META } from "./gameData";
import { cn } from "../utils/cn";

/**
 * Universal question editor: each game mode has a specific form to input
 * the questions/data. The `payload` shape matches what GameHost expects.
 */

export interface EditorProps {
  payload: any;
  onChange: (p: any) => void;
}

/** Default empty payload for each mode (used when teacher first picks a mode) */
export function defaultPayload(mode: GameMode): any {
  switch (mode) {
    case "dark_maze":
      return { rounds: 4, questions: [emptyMC(), emptyMC(), emptyMC(), emptyMC()] };
    case "time_bomb":
      return { seconds: 45, q: "", options: ["", "", "", ""], correctIndex: 0 };
    case "crypto_breaker":
      return { encoded: "", shift: 3, answer: "" };
    case "chain_reaction":
      return { chain: [emptyMC(), emptyMC(), emptyMC(), emptyMC()] };
    case "boss_fight":
      return { phases: [emptyMC(), emptyMC(), emptyMC()] };
    case "deep_dive":
      return { facts: [emptyFact(true), emptyFact(true), emptyFact(false), emptyFact(true), emptyFact(false), emptyFact(true)] };
    case "minesweeper":
      return { q: "", needed: 4, options: [emptyMine(true), emptyMine(true), emptyMine(false), emptyMine(true), emptyMine(false), emptyMine(true), emptyMine(false), emptyMine(false)] };
    case "blueprint":
      return { target: ["a", "+", "b", "=", "c"], shuffled: ["b", "=", "a", "c", "+"] };
    case "pvp_arena":
      return { q: "", options: ["", "", "", ""], correctIndex: 0, opponentDelay: 12 };
    case "bug_hunter":
      return { code: "function sum(a, b) {\n  return a - b;\n}", bugLine: 1, hint: "Amal noto'g'ri" };
    case "hardcore":
      return { lives: 3, questions: [emptyMC(), emptyMC(), emptyMC(), emptyMC(), emptyMC()] };
    case "tower_defense":
      return { waves: 5, maxHp: 100, questions: [emptyMC(), emptyMC(), emptyMC(), emptyMC(), emptyMC()] };
    case "evolving":
      return { questions: [{ ...emptyMC(), difficulty: 1 }, { ...emptyMC(), difficulty: 2 }, { ...emptyMC(), difficulty: 3 }, { ...emptyMC(), difficulty: 4 }, { ...emptyMC(), difficulty: 5 }] };
    case "paradox":
      return { scenario: "", options: ["", "", "", ""], correctIndex: 0 };
    case "judgment":
      return { case: "", pros: [emptyValid(true), emptyValid(true), emptyValid(false), emptyValid(true)], cons: [emptyValid(true), emptyValid(false), emptyValid(true), emptyValid(true)] };
  }
}

const emptyMC = () => ({ q: "", options: ["", "", "", ""], correct: 0 });
const emptyFact = (truth: boolean) => ({ text: "", truth });
const emptyMine = (safe: boolean) => ({ text: "", safe });
const emptyValid = (valid: boolean) => ({ text: "", valid });

/** Render appropriate editor for the game mode */
export function QuestionEditor({ mode, payload, onChange }: { mode: GameMode; payload: any; onChange: (p: any) => void }) {
  const meta = GAME_MODE_META[mode];

  return (
    <div className="space-y-4">
      <div className={cn("p-3 rounded-lg bg-gradient-to-br border border-white/20", meta.color)}>
        <div className="flex items-center gap-3">
          <div className="text-3xl">{meta.icon}</div>
          <div>
            <div className="text-xs uppercase text-white/70 tracking-widest">Tanlangan rejim</div>
            <div className="font-display font-bold text-white">{meta.name}</div>
            <div className="text-xs text-white/80">{meta.desc}</div>
          </div>
        </div>
      </div>

      {mode === "dark_maze"      && <MCListEditor payload={payload} onChange={onChange} listKey="questions" label="Labirint eshiklari (4 ta savol)" min={2} max={8} />}
      {mode === "time_bomb"      && <TimeBombEditor payload={payload} onChange={onChange} />}
      {mode === "crypto_breaker" && <CryptoEditor payload={payload} onChange={onChange} />}
      {mode === "chain_reaction" && <MCListEditor payload={payload} onChange={onChange} listKey="chain" label="Zanjir bo'g'inlari" min={3} max={8} />}
      {mode === "boss_fight"     && <MCListEditor payload={payload} onChange={onChange} listKey="phases" label="Boss faza savollari (3 ta)" min={2} max={5} />}
      {mode === "deep_dive"      && <FactsEditor payload={payload} onChange={onChange} />}
      {mode === "minesweeper"    && <MineEditor payload={payload} onChange={onChange} />}
      {mode === "blueprint"      && <BlueprintEditor payload={payload} onChange={onChange} />}
      {mode === "pvp_arena"      && <PvpEditor payload={payload} onChange={onChange} />}
      {mode === "bug_hunter"     && <BugEditor payload={payload} onChange={onChange} />}
      {mode === "hardcore"       && <HardcoreEditor payload={payload} onChange={onChange} />}
      {mode === "tower_defense"  && <TowerEditor payload={payload} onChange={onChange} />}
      {mode === "evolving"       && <EvolvingEditor payload={payload} onChange={onChange} />}
      {mode === "paradox"        && <ParadoxEditor payload={payload} onChange={onChange} />}
      {mode === "judgment"       && <JudgmentEditor payload={payload} onChange={onChange} />}
    </div>
  );
}

/* --------------- Reusable MC (multi-choice) editor --------------- */
function MCItemEditor({ item, onChange, onDelete, index, canDelete }: {
  item: { q: string; options: string[]; correct: number };
  onChange: (v: any) => void; onDelete: () => void; index: number; canDelete: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-black/30 border border-white/10 space-y-2">
      <div className="flex items-center justify-between">
        <Badge tone="cyan">Savol #{index + 1}</Badge>
        {canDelete && <button onClick={onDelete} className="text-xs text-rose-300 hover:text-rose-200">🗑 O'chirish</button>}
      </div>
      <Input placeholder="Savol matni..." value={item.q} onChange={e => onChange({ ...item, q: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        {item.options.map((opt: string, i: number) => (
          <div key={i} className="flex gap-1">
            <button onClick={() => onChange({ ...item, correct: i })}
              className={cn("w-8 h-8 shrink-0 rounded grid place-items-center font-bold text-xs",
                item.correct === i ? "bg-lime-400 text-black" : "bg-white/5 text-white/40 hover:bg-white/10")}>
              {String.fromCharCode(65 + i)}
            </button>
            <input value={opt} onChange={e => {
              const opts = [...item.options]; opts[i] = e.target.value; onChange({ ...item, options: opts });
            }} placeholder={`Variant ${String.fromCharCode(65+i)}`}
              className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50" />
          </div>
        ))}
      </div>
      <div className="text-[10px] text-white/40">💡 To'g'ri javob harfini bosing (yashil rangda ko'rinadi)</div>
    </div>
  );
}

function MCListEditor({ payload, onChange, listKey, label, min, max }: EditorProps & { listKey: string; label: string; min: number; max: number }) {
  const list = payload[listKey] || [];
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
        <Badge tone="gray">{list.length} ta</Badge>
      </div>
      <div className="space-y-2">
        {list.map((item: any, i: number) => (
          <MCItemEditor key={i} item={item} index={i} canDelete={list.length > min}
            onChange={v => { const nl = [...list]; nl[i] = v; onChange({ ...payload, [listKey]: nl }); }}
            onDelete={() => onChange({ ...payload, [listKey]: list.filter((_: any, x: number) => x !== i) })} />
        ))}
      </div>
      {list.length < max && (
        <Button tone="secondary" size="sm" className="mt-2 w-full" onClick={() => onChange({ ...payload, [listKey]: [...list, emptyMC()] })}>+ Savol qo'shish</Button>
      )}
    </div>
  );
}

/* --------------- Individual editors --------------- */

function TimeBombEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Bomba vaqti (sekund)" type="number" min={10} max={300} value={payload.seconds}
          onChange={e => onChange({ ...payload, seconds: +e.target.value })} />
        <Input label="To'g'ri javob (A/B/C/D)" value={String.fromCharCode(65 + payload.correctIndex)} disabled />
      </div>
      <Textarea label="Defuzatsiya savoli" rows={2} value={payload.q} onChange={e => onChange({ ...payload, q: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        {payload.options.map((o: string, i: number) => (
          <div key={i} className="flex gap-1">
            <button onClick={() => onChange({ ...payload, correctIndex: i })}
              className={cn("w-8 h-8 shrink-0 rounded grid place-items-center font-bold text-xs",
                payload.correctIndex === i ? "bg-lime-400 text-black" : "bg-white/5 text-white/40 hover:bg-white/10")}>
              {String.fromCharCode(65 + i)}
            </button>
            <input value={o} onChange={e => {
              const opts = [...payload.options]; opts[i] = e.target.value; onChange({ ...payload, options: opts });
            }} placeholder="Variant..."
              className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CryptoEditor({ payload, onChange }: EditorProps) {
  const encode = (word: string, shift: number) =>
    word.toUpperCase().split("").map(c =>
      /[A-Z]/.test(c) ? String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65) : c
    ).join("");

  return (
    <div className="space-y-3">
      <Input label="Yashiriladigan so'z / javob" value={payload.answer}
        onChange={e => {
          const v = e.target.value.toUpperCase();
          onChange({ ...payload, answer: v, encoded: encode(v, payload.shift) });
        }} placeholder="Masalan: ARENA" />
      <Input label="Caesar siljish (1-25)" type="number" min={1} max={25} value={payload.shift}
        onChange={e => {
          const s = +e.target.value;
          onChange({ ...payload, shift: s, encoded: encode(payload.answer, s) });
        }} />
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
        <div className="text-xs text-emerald-300 mb-1">Talaba shu shifrni oladi:</div>
        <div className="font-mono text-2xl text-emerald-200 tracking-widest">{payload.encoded || "—"}</div>
      </div>
    </div>
  );
}

function FactsEditor({ payload, onChange }: EditorProps) {
  const facts = payload.facts || [];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Faktlar (rost va yolg'onlarni belgilang)</div>
      <div className="space-y-2">
        {facts.map((f: any, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-black/30 border border-white/10 flex items-start gap-2">
            <button onClick={() => {
              const nf = [...facts]; nf[i] = { ...f, truth: !f.truth }; onChange({ ...payload, facts: nf });
            }} className={cn("shrink-0 px-2 py-1 rounded font-bold text-xs",
              f.truth ? "bg-lime-500/30 text-lime-200 border border-lime-400" : "bg-rose-500/30 text-rose-200 border border-rose-400")}>
              {f.truth ? "✓ ROST" : "✕ YOLG'ON"}
            </button>
            <input value={f.text} onChange={e => {
              const nf = [...facts]; nf[i] = { ...f, text: e.target.value }; onChange({ ...payload, facts: nf });
            }} placeholder="Fakt matni..."
              className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white" />
            {facts.length > 3 && (
              <button onClick={() => onChange({ ...payload, facts: facts.filter((_: any, x: number) => x !== i) })} className="text-rose-300 text-sm">🗑</button>
            )}
          </div>
        ))}
      </div>
      {facts.length < 10 && (
        <Button tone="secondary" size="sm" className="mt-2 w-full" onClick={() => onChange({ ...payload, facts: [...facts, { text: "", truth: true }] })}>+ Fakt qo'shish</Button>
      )}
    </div>
  );
}

function MineEditor({ payload, onChange }: EditorProps) {
  const safeCount = payload.options.filter((o: any) => o.safe).length;
  return (
    <div className="space-y-3">
      <Input label="Savol (masalan: Frontend texnologiyalarni tanlang)" value={payload.q} onChange={e => onChange({ ...payload, q: e.target.value })} />
      <Input label={`Kerakli xavfsiz javoblar (${safeCount} ta mavjud)`} type="number" min={1} max={safeCount} value={payload.needed} onChange={e => onChange({ ...payload, needed: +e.target.value })} />
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Yacheykalar (safe/mine)</div>
        <div className="grid grid-cols-2 gap-2">
          {payload.options.map((o: any, i: number) => (
            <div key={i} className="flex gap-1">
              <button onClick={() => {
                const opts = [...payload.options]; opts[i] = { ...o, safe: !o.safe }; onChange({ ...payload, options: opts });
              }} className={cn("shrink-0 w-8 h-8 rounded font-bold text-xs",
                o.safe ? "bg-lime-500/30 text-lime-200" : "bg-rose-500/30 text-rose-200")}>
                {o.safe ? "✓" : "💥"}
              </button>
              <input value={o.text} onChange={e => {
                const opts = [...payload.options]; opts[i] = { ...o, text: e.target.value }; onChange({ ...payload, options: opts });
              }} placeholder="Matn..." className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlueprintEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">To'g'ri tartibda (bo'sh joy bilan ajrating)</div>
        <Input value={(payload.target || []).join(" ")} onChange={e => {
          const t = e.target.value.split(/\s+/).filter(Boolean);
          const sh = [...t].sort(() => Math.random() - 0.5);
          onChange({ ...payload, target: t, shuffled: sh });
        }} placeholder="a + b = c" />
      </div>
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-400/30">
        <div className="text-xs text-blue-300 mb-1">Talabaga aralashtirilgan ko'rinishda ko'rsatiladi:</div>
        <div className="font-mono text-white flex gap-2 flex-wrap">
          {(payload.shuffled || []).map((s: string, i: number) => (
            <span key={i} className="px-2 py-1 rounded bg-blue-500/30 border border-blue-400 text-sm">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PvpEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Input label="Poyga savoli" value={payload.q} onChange={e => onChange({ ...payload, q: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        {payload.options.map((o: string, i: number) => (
          <div key={i} className="flex gap-1">
            <button onClick={() => onChange({ ...payload, correctIndex: i })}
              className={cn("w-8 h-8 shrink-0 rounded grid place-items-center font-bold text-xs",
                payload.correctIndex === i ? "bg-lime-400 text-black" : "bg-white/5 text-white/40")}>
              {String.fromCharCode(65 + i)}
            </button>
            <input value={o} onChange={e => {
              const opts = [...payload.options]; opts[i] = e.target.value; onChange({ ...payload, options: opts });
            }} className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white" />
          </div>
        ))}
      </div>
      <Input label="Raqib sekundi (qanchada javob beradi)" type="number" min={3} max={60} value={payload.opponentDelay} onChange={e => onChange({ ...payload, opponentDelay: +e.target.value })} />
    </div>
  );
}

function BugEditor({ payload, onChange }: EditorProps) {
  const lines = payload.code.split("\n");
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Kod / matn (qatorlarga bo'ling)</div>
        <textarea value={payload.code} onChange={e => onChange({ ...payload, code: e.target.value })}
          rows={7} className="w-full px-3 py-2 rounded-lg bg-black/50 border border-emerald-400/30 text-sm text-emerald-200 font-mono focus:outline-none focus:border-emerald-400" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Bug qaysi qatorda? (0 dan boshlab)</div>
        <div className="grid grid-cols-8 gap-1">
          {lines.map((_: string, i: number) => (
            <button key={i} onClick={() => onChange({ ...payload, bugLine: i })}
              className={cn("h-8 rounded font-mono text-xs",
                payload.bugLine === i ? "bg-rose-500/40 text-rose-100 border border-rose-400" : "bg-white/5 text-white/60 hover:bg-white/10")}>
              {i}
            </button>
          ))}
        </div>
      </div>
      <Input label="Maslahat" value={payload.hint} onChange={e => onChange({ ...payload, hint: e.target.value })} />
    </div>
  );
}

function HardcoreEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Hayotlar soni" value={payload.lives} onChange={e => onChange({ ...payload, lives: +e.target.value })}>
          <option value={1}>1 ❤️</option><option value={2}>2 ❤️</option><option value={3}>3 ❤️</option><option value={5}>5 ❤️</option>
        </Select>
      </div>
      <MCListEditor payload={payload} onChange={onChange} listKey="questions" label="Hardcore savollar" min={3} max={10} />
    </div>
  );
}

function TowerEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Minora HP" type="number" min={50} max={500} value={payload.maxHp} onChange={e => onChange({ ...payload, maxHp: +e.target.value })} />
        <Input label="To'lqinlar soni" type="number" min={3} max={10} value={payload.questions.length} disabled />
      </div>
      <MCListEditor payload={payload} onChange={onChange} listKey="questions" label="Har to'lqin savoli" min={3} max={10} />
    </div>
  );
}

function EvolvingEditor({ payload, onChange }: EditorProps) {
  const list = payload.questions || [];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Evolyutsiya savollari (qiyinlik oshib boradi)</div>
      <div className="space-y-2">
        {list.map((item: any, i: number) => (
          <div key={i} className="p-3 rounded-lg bg-black/30 border border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone="violet">Level {i + 1}</Badge>
              <Select value={item.difficulty} onChange={e => {
                const nl = [...list]; nl[i] = { ...item, difficulty: +e.target.value }; onChange({ ...payload, questions: nl });
              }}>
                <option value={1}>Qiyinlik ★</option>
                <option value={2}>Qiyinlik ★★</option>
                <option value={3}>Qiyinlik ★★★</option>
                <option value={4}>Qiyinlik ★★★★</option>
                <option value={5}>Qiyinlik ★★★★★</option>
              </Select>
            </div>
            <Input placeholder="Savol..." value={item.q} onChange={e => {
              const nl = [...list]; nl[i] = { ...item, q: e.target.value }; onChange({ ...payload, questions: nl });
            }} />
            <div className="grid grid-cols-2 gap-2">
              {item.options.map((o: string, oi: number) => (
                <div key={oi} className="flex gap-1">
                  <button onClick={() => {
                    const nl = [...list]; nl[i] = { ...item, correct: oi }; onChange({ ...payload, questions: nl });
                  }} className={cn("w-8 h-8 shrink-0 rounded font-bold text-xs",
                    item.correct === oi ? "bg-lime-400 text-black" : "bg-white/5 text-white/40")}>
                    {String.fromCharCode(65 + oi)}
                  </button>
                  <input value={o} onChange={e => {
                    const nl = [...list]; const opts = [...item.options]; opts[oi] = e.target.value; nl[i] = { ...item, options: opts }; onChange({ ...payload, questions: nl });
                  }} className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParadoxEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Textarea label="Ssenariy / paradoks matni" rows={3} value={payload.scenario} onChange={e => onChange({ ...payload, scenario: e.target.value })} />
      <div className="text-[10px] uppercase tracking-widest text-white/40">Variantlar (to'g'risini belgilang)</div>
      <div className="space-y-2">
        {payload.options.map((o: string, i: number) => (
          <div key={i} className="flex gap-2">
            <button onClick={() => onChange({ ...payload, correctIndex: i })}
              className={cn("w-8 h-8 shrink-0 rounded font-bold text-xs",
                payload.correctIndex === i ? "bg-lime-400 text-black" : "bg-white/5 text-white/40")}>
              {String.fromCharCode(65 + i)}
            </button>
            <input value={o} onChange={e => {
              const opts = [...payload.options]; opts[i] = e.target.value; onChange({ ...payload, options: opts });
            }} placeholder="Variant..." className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white" />
          </div>
        ))}
      </div>
    </div>
  );
}

function JudgmentEditor({ payload, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <Textarea label="Sud ishi / muammo" rows={2} value={payload.case} onChange={e => onChange({ ...payload, case: e.target.value })} />
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-lime-300 mb-2">✓ HIMOYA argumentlari</div>
          <div className="space-y-1">
            {payload.pros.map((p: any, i: number) => (
              <div key={i} className="flex gap-1">
                <button onClick={() => {
                  const np = [...payload.pros]; np[i] = { ...p, valid: !p.valid }; onChange({ ...payload, pros: np });
                }} className={cn("shrink-0 w-6 h-8 rounded text-xs",
                  p.valid ? "bg-lime-500/40 text-lime-100" : "bg-white/5 text-white/40")}>
                  {p.valid ? "✓" : "✕"}
                </button>
                <input value={p.text} onChange={e => {
                  const np = [...payload.pros]; np[i] = { ...p, text: e.target.value }; onChange({ ...payload, pros: np });
                }} className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white" placeholder="Argument..." />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-rose-300 mb-2">✗ QORALASH argumentlari</div>
          <div className="space-y-1">
            {payload.cons.map((c: any, i: number) => (
              <div key={i} className="flex gap-1">
                <button onClick={() => {
                  const nc = [...payload.cons]; nc[i] = { ...c, valid: !c.valid }; onChange({ ...payload, cons: nc });
                }} className={cn("shrink-0 w-6 h-8 rounded text-xs",
                  c.valid ? "bg-lime-500/40 text-lime-100" : "bg-white/5 text-white/40")}>
                  {c.valid ? "✓" : "✕"}
                </button>
                <input value={c.text} onChange={e => {
                  const nc = [...payload.cons]; nc[i] = { ...c, text: e.target.value }; onChange({ ...payload, cons: nc });
                }} className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white" placeholder="Argument..." />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
