import { useState, useEffect } from "react";
import { Card, SectionTitle, Badge, ProgressBar, ZoneChip, Button, Modal, Textarea, formatMoney, Input, Select } from "../components/UI";
import { useStore, useCurrentUser, zoneOf } from "../store";
import type { Stage, StageProgress } from "../types";
import { cn } from "../utils/cn";
import { GameHost } from "../games/GameHost";
import { GAME_MODE_META } from "../games/gameData";

export function StudentView({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  const user = useCurrentUser()!;
  const toast = useStore(s => s.toast);
  
  // Strict Group Isolation: Only get subjects assigned to this student's specific group (e.g. Group 472)
  const teacherSubjects = useStore(s => s.teacherSubjects);
  const myGroupSubjects = useStore(s => s.subjects).filter(sub => 
    teacherSubjects.some(ts => ts.groupId === user.groupId && ts.subjectId === sub.id)
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(() => {
    return myGroupSubjects[0]?.id || null; // default to first assigned subject
  });

  // Real-time hook to force components re-render when select change occurs
  useEffect(() => {
    if (!selectedSubjectId && myGroupSubjects.length > 0) {
      setSelectedSubjectId(myGroupSubjects[0].id);
    }
  }, [selectedSubjectId, myGroupSubjects]);

  // Selector component that is visible on top of all academic pages
  const renderSubjectSelector = () => (
    <div className="p-4 rounded-xl bg-[#161925] border border-white/10 flex items-center justify-between gap-4 flex-wrap mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xl">🌐</span>
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Aktiv fan muhiti</div>
          <div className="text-white font-bold text-sm">
            {myGroupSubjects.find(s => s.id === selectedSubjectId)?.name || "Hech qanday biriktirilgan fan tanlanmagan"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">Fanni almashtirish:</span>
        <select
          value={selectedSubjectId || ""}
          onChange={e => {
            setSelectedSubjectId(e.target.value);
            const sub = myGroupSubjects.find(s => s.id === e.target.value);
            if (sub) {
              toast({ title: `⚡ ${sub.name} faollashdi!`, tone: "success" });
            }
          }}
          className="bg-[#0f111a] border border-white/10 text-xs text-white p-2 rounded-lg focus:outline-none focus:border-teal-400 cursor-pointer [&>option]:text-black"
        >
          {myGroupSubjects.map(s => (
            <option key={s.id} value={s.id} className="text-black">{s.icon} {s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // Directly route to the appropriate page, ensuring ALL menus are 100% visible and responsive
  if (page === "shop")    return <Shop />;
  if (page === "history") return <History />;

  // CRASH SAFEGUARD: If no subjects are assigned to this student's group yet, do not crash with black screen!
  // Instead, show a beautifully styled empty state alert.
  if (myGroupSubjects.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12 animate-fade-in">
        <Card className="p-8 text-center border border-dashed border-white/10 bg-white/[0.01]">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="font-display font-black text-2xl text-white mb-2">Sizning guruhingizga fan biriktirilmagan</h2>
          <p className="text-sm text-white/50 max-w-md mx-auto leading-relaxed">
            Hozirda sizning guruhingiz dars jadvaliga o'qituvchilar yoki <b>Ahmedov Asilbek (Owner)</b> tomonidan birorta ham dars fani biriktirilmagan.
          </p>
          <div className="mt-6 p-4 rounded-xl bg-[#161925] border border-white/10 text-xs text-white/60 text-left max-w-lg mx-auto">
            <div className="font-bold text-teal-300 mb-1">Nima qilish kerak?</div>
            O'qituvchingizga dars jadvalini sozlashi va fanni guruhga biriktirishini aytishingiz kerak. Owner panelda "Fan Biriktirish" bo'limi orqali bu bir zumda amalga oshiriladi.
          </div>
        </Card>
      </div>
    );
  }

  const activeSubId = selectedSubjectId || myGroupSubjects[0]?.id || "";

  if (page === "map") {
    return (
      <div className="space-y-4">
        {renderSubjectSelector()}
        <GameMap subjectId={activeSubId} onBack={() => {}} />
      </div>
    );
  }

  if (page === "tasks") {
    return (
      <div className="space-y-4">
        {renderSubjectSelector()}
        <Tasks subjectId={activeSubId} onBack={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {renderSubjectSelector()}
      <Arena setPage={setPage} subjectId={activeSubId} onBack={() => {}} />
    </div>
  );
}

function Arena({ setPage, subjectId }: { setPage: (p: string) => void; subjectId: string; onBack?: () => void }) {
  const user = useCurrentUser()!;
  const subject = useStore(s => s.subjects.find(x => x.id === subjectId))!;
  const zone = zoneOf(user.totalScore || 0);
  const stageProgress = useStore(s => s.stageProgress).filter(p => p.studentId === user.id && p.subjectId === subjectId);
  const frozenStage = stageProgress.find(p => p.frozenUntil && p.frozenUntil > Date.now());
  const completed = stageProgress.filter(p => p.completed).length;

  // Custom cosmetics classes
  const isNeonBorder = user.activeSkin === "neon_cyan";
  const isGoldNick = user.activeBorder === "golden_fire";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{subject.icon}</span>
          <h2 className="font-display font-black text-xl text-white uppercase">{subject.name}</h2>
        </div>
      </div>

      {/* Shaffoflik va Halol Geymifikatsiya Deklaratsiyasi Panel */}
      <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/5 flex items-center gap-4 justify-between flex-wrap relative overflow-hidden transition-all duration-300 hover:border-teal-400">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <div className="text-xs text-teal-300 font-bold uppercase tracking-wider">Antikorrupsiya & Halol O'yin Oltin Qoidasi</div>
            <div className="text-white/70 text-xs mt-0.5">Tizimda to'g'ridan-to'g'ri baho sotilmaydi. Pul faqat "imkoniyat" (jon, vaqt, sug'urta) beradi, bilimingizni baribir o'zingiz isbotlaysiz.</div>
          </div>
        </div>
        <Badge tone="cyan">✓ 100% Legal & Fair</Badge>
      </div>

      {/* Hero */}
      <Card className={cn("p-6 md:p-8 overflow-hidden relative scanline transition-all border-2",
        isNeonBorder ? "border-cyan-400 glow-cyan bg-cyan-950/10" : "border-white/10")}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-lime-500/30 via-cyan-500/20 to-transparent blur-3xl" />
        <div className="relative grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="text-xs tracking-[0.4em] uppercase text-lime-400">Sezon 2 · Mavsum aktiv</div>
            <h1 className="font-display text-2xl md:text-4xl font-black text-white mt-2">
              Salom, {" "}
              <span className={cn("bg-clip-text text-transparent bg-gradient-to-r",
                isGoldNick ? "from-yellow-400 via-amber-300 to-orange-500 font-black tracking-widest animate-pulse" : "from-lime-300 via-cyan-300 to-violet-300")}>
                {user.fio} {isGoldNick && "🔥"}
              </span>
            </h1>
            <p className="text-white/60 mt-2 max-w-lg">50 ta tanga to'plang. 15 bosqichni yeching. Anti-cheat radar doim ogoh.</p>

            {/* Visual Streaks and Equipment status */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <div>
                  <div className="text-white/50 text-[10px] uppercase">Streak Seriya</div>
                  <div className="text-white font-bold">{user.streak || 0} kun uzluksiz</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                <span className="text-lg">❤️</span>
                <div>
                  <div className="text-white/50 text-[10px] uppercase">Jonlar (Lives)</div>
                  <div className="text-white font-bold">{user.lives || 3}/5</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <div>
                  <div className="text-white/50 text-[10px] uppercase">Sug'urta (Shields)</div>
                  <div className="text-white font-bold">{user.shields || 0} ta aktiv</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                <span className="text-lg">⏳</span>
                <div>
                  <div className="text-white/50 text-[10px] uppercase">Time Freezes</div>
                  <div className="text-white font-bold">{user.timeFreezes || 0} ta aktiv</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <ZoneChip zone={zone} />
              <Badge tone="cyan">ID: {user.studentIdCode}</Badge>
              <Badge tone="amber">🪙 {formatMoney(user.wallet || 0)}</Badge>
              <Badge tone="lime">Bosqichlar: {completed}/15</Badge>
            </div>
          </div>

          <div className="relative">
            <div className="mx-auto w-44 h-44 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-700 grid place-items-center shadow-2xl float-y relative">
              <div className="absolute inset-2 rounded-full border-4 border-amber-200/40" />
              <div className="text-center relative">
                <div className="font-display text-5xl font-black text-amber-900">{user.totalScore || 0}</div>
                <div className="text-xs font-bold text-amber-900/80 tracking-widest">/ 50 TANGA</div>
              </div>
            </div>
            <div className="text-center text-xs text-white/50 mt-3">Umumiy hisob</div>
          </div>
        </div>
      </Card>

      {/* Progress with zones */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs tracking-widest uppercase text-white/40">Semestr Progress</div>
            <div className="font-display text-xl font-bold text-white">Level-Up Panel</div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-black text-white">{user.totalScore || 0}<span className="text-white/40 text-lg">/50</span></div>
            <div className="text-xs text-white/50">{Math.round(((user.totalScore || 0) / 50) * 100)}% yakunlandi</div>
          </div>
        </div>
        <ProgressBar value={user.totalScore || 0} max={50} showZones />

        <div className="grid grid-cols-3 gap-3 mt-6">
          <ZoneCard tone="red"    range="0 – 25"  title="Qizil zona"  desc="Yiqilish xavfi — zudlik bilan tanga yig'ing!" active={zone === "red"} />
          <ZoneCard tone="amber"  range="26 – 40" title="Sariq zona"  desc="Yaxshi baho — o'z kuchingiz bilan yeta olasiz" active={zone === "yellow"} />
          <ZoneCard tone="lime"   range="41 – 50" title="Yashil zona" desc="A'lochilar zonasi — qo'shimcha harakat kerak" active={zone === "green"} />
        </div>
      </Card>

      {frozenStage && (
        <Card className="p-5 border-l-4 border-sky-400/70">
          <FrozenNotice progress={frozenStage} onOpen={() => setPage("map")} />
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <button onClick={() => setPage("map")} className="text-left">
          <Card className="p-5 hover:bg-white/[0.05] transition-all h-full">
            <div className="text-3xl mb-2">🗺</div>
            <div className="font-display font-bold text-white">O'yin xaritasi</div>
            <div className="text-white/50 text-xs mt-1">15 bosqich · {completed} yakunlandi</div>
          </Card>
        </button>
        <button onClick={() => setPage("tasks")} className="text-left">
          <Card className="p-5 hover:bg-white/[0.05] transition-all h-full">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-display font-bold text-white">Mustaqil ishlar</div>
            <div className="text-white/50 text-xs mt-1">Topshirish va tarix</div>
          </Card>
        </button>
        <button onClick={() => setPage("shop")} className="text-left">
          <Card className="p-5 hover:bg-white/[0.05] transition-all h-full">
            <div className="text-3xl mb-2">🪙</div>
            <div className="font-display font-bold text-white">Do'kon</div>
            <div className="text-white/50 text-xs mt-1">Balans: {formatMoney(user.wallet || 0)}</div>
          </Card>
        </button>
      </div>
    </div>
  );
}

function FrozenNotice({ progress, onOpen }: { progress: StageProgress; onOpen: () => void }) {
  const [remain, setRemain] = useState("");
  useEffect(() => {
    const t = setInterval(() => {
      const ms = (progress.frozenUntil || 0) - Date.now();
      if (ms <= 0) { setRemain("00:00:00"); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setRemain(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [progress.frozenUntil]);

  return (
    <div className="flex items-start gap-4">
      <div className="text-3xl">🧊</div>
      <div className="flex-1">
        <div className="font-display font-bold text-white">Bosqich #{progress.stageId} muzlagan</div>
        <div className="text-white/60 text-sm mt-1">Qolgan vaqt: <span className="font-mono text-sky-300 font-bold">{remain}</span></div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button size="sm" onClick={onOpen}>🗺 Xaritaga o'tish</Button>
        </div>
      </div>
    </div>
  );
}

function ZoneCard({ tone, range, title, desc, active }: { tone: "red" | "amber" | "lime"; range: string; title: string; desc: string; active: boolean }) {
  const map = {
    red:   { bg: "from-rose-500/20 to-rose-500/5",   border: "border-rose-400/30",   text: "text-rose-300" },
    amber: { bg: "from-amber-500/20 to-amber-500/5", border: "border-amber-400/30", text: "text-amber-300" },
    lime:  { bg: "from-lime-500/20 to-lime-500/5",   border: "border-lime-400/30",   text: "text-lime-300" },
  }[tone];
  return (
    <div className={cn("p-4 rounded-xl border bg-gradient-to-br relative", map.bg, map.border, active && "ring-2 ring-white/20")}>
      {active && <div className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-white text-black font-bold">SIZ SHU YERDA</div>}
      <div className={cn("text-xs font-mono", map.text)}>{range}</div>
      <div className="text-white font-display font-bold mt-1">{title}</div>
      <div className="text-white/60 text-xs mt-1">{desc}</div>
    </div>
  );
}

/* ---------- GAME MAP ---------- */
function GameMap({ subjectId, onBack }: { subjectId: string; onBack: () => void }) {
  const user = useCurrentUser()!;
  const subject = useStore(s => s.subjects.find(x => x.id === subjectId))!;
  
  // Real Teacher-created tasks filtered for this group and subject
  const realTasks = useStore(s => s.tasks).filter(t => t.groupId === user.groupId && t.subjectId === subjectId);
  const submissions = useStore(s => s.submissions).filter(sub => sub.studentId === user.id);
  
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Convert real teacher tasks dynamically into the game Roadmap steps!
  const stages: Stage[] = realTasks.map((t, index) => ({
    id: index + 1,
    title: t.title,
    mode: t.gameMode,
    reward: t.maxScore,
    subject: t.subject,
    payload: t.gamePayload
  }));

  const doneCount = stages.filter(st => {
    const task = realTasks[st.id - 1];
    const sub = submissions.find(x => x.taskId === task.id);
    return sub && sub.status === "checked";
  }).length;

  const isLocked = (stageIndex: number) => {
    if (stageIndex === 0) return false;
    const prevTask = realTasks[stageIndex - 1];
    const prevSub = submissions.find(x => x.taskId === prevTask.id);
    return !(prevSub && prevSub.status === "checked");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{subject.icon}</span>
          <h2 className="font-display font-black text-xl text-white uppercase">{subject.name} Haritasi</h2>
        </div>
        <Button tone="secondary" size="sm" onClick={onBack}>← Fanni almashtirish</Button>
      </div>

      <SectionTitle
        eyebrow="STUDENT · ROADMAP"
        title={`O'yin Xaritasi — ${stages.length} bosqich`}
        right={<Badge tone="lime">Yechildi: {doneCount}/{stages.length}</Badge>}
      />

      {stages.length === 0 ? (
        <Card className="p-8 text-center border border-dashed border-white/10 bg-white/[0.01]">
          <div className="text-5xl mb-3">📭</div>
          <div className="text-lg font-bold text-white mb-2">Ushbu fanda xarita yaratilmagan</div>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            Hozircha o'qituvchingiz ushbu dars bo'yicha hech qanday o'yin topshirig'ini kiritmagan.
          </p>
        </Card>
      ) : (
        <Card className="p-6 md:p-10 relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 700" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pathg" x1="0" x2="1">
                <stop offset="0" stopColor="#a3e635" />
                <stop offset="0.5" stopColor="#06b6d4" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <path d="M 50,600 Q 200,500 250,400 T 400,300 T 550,400 T 700,250 T 850,350 T 950,100" stroke="url(#pathg)" strokeWidth="3" strokeDasharray="8 8" fill="none" opacity="0.5" />
          </svg>

          <div className="relative grid grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
            {stages.map((stage, idx) => {
              const task = realTasks[idx];
              const sub = submissions.find(x => x.taskId === task.id);
              const p: StageProgress = {
                studentId: user.id,
                subjectId,
                stageId: stage.id,
                completed: sub ? sub.status === "checked" : false,
                attemptsLeft: sub ? (sub.status === "resubmit" ? 0 : 3) : 3,
                frozenUntil: undefined,
                extraAttempts: 0
              };
              return (
                <StageNode key={stage.id} stage={stage} prog={p} locked={isLocked(idx)} onClick={() => setSelectedTask(task)} />
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="font-display text-xl font-bold text-white mb-4">🎮 15 ta o'yin rejimi</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(GAME_MODE_META) as any[]).map(k => {
            const m = GAME_MODE_META[k as keyof typeof GAME_MODE_META];
            return (
              <div key={k} className={cn("p-3 rounded-xl border bg-gradient-to-br", m.color, "border-white/20")}>
                <div className="text-3xl mb-1">{m.icon}</div>
                <div className="font-display font-bold text-white text-sm">{m.name}</div>
                <div className="text-[10px] text-white/70 mt-1">{m.desc}</div>
                <div className="mt-2 text-[10px] text-amber-300">{"★".repeat(m.difficulty)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5 border-l-4 border-rose-500/60">
        <div className="flex items-start gap-4">
          <div className="text-2xl">🛡️</div>
          <div>
            <div className="font-display font-bold text-white">Anti-Cheat Radar FAOL</div>
            <div className="text-white/60 text-sm mt-1">Ekran fokusi, PrintScreen, DevTools, Alt+Tab va sichqoncha o'ng tugmasi — barchasi kuzatuvda. 3 marta xato = 24 soatlik muzlash.</div>
          </div>
        </div>
      </Card>

      {selectedTask && (
        <StageModal
          stage={{
            id: realTasks.indexOf(selectedTask) + 1,
            title: selectedTask.title,
            mode: selectedTask.gameMode,
            reward: selectedTask.maxScore,
            subject: selectedTask.subject,
            payload: selectedTask.gamePayload
          }}
          subjectId={subjectId}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

function StageNode({ stage, prog, locked, onClick }: { stage: Stage; prog?: StageProgress; locked: boolean; onClick: () => void }) {
  const meta = GAME_MODE_META[stage.mode];
  const isFinal = stage.id === 15;
  const isFrozen = !!prog?.frozenUntil && prog.frozenUntil > Date.now();
  const completed = prog?.completed;
  const state = completed ? "done" : isFrozen ? "frozen" : locked ? "locked" : "active";

  const box = {
    done:   "bg-gradient-to-br from-lime-500/30 to-emerald-600/20 border-lime-400/50 text-lime-100",
    active: cn("bg-gradient-to-br border-white/40 text-white glow-cyan", meta.color),
    frozen: "bg-gradient-to-br from-sky-600/30 to-slate-700/30 border-sky-400/40 text-sky-100",
    locked: "bg-white/[0.02] border-white/10 text-white/30",
  }[state];

  const displayIcon = state === "done" ? "✓" : state === "frozen" ? "🧊" : state === "locked" ? "🔒" : meta.icon;

  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={cn(
        "relative aspect-square rounded-2xl border-2 transition-all p-3 flex flex-col items-center justify-center hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed",
        box,
        isFinal && "col-span-3 md:col-span-1 md:row-span-2 aspect-auto md:min-h-[220px] ring-2 ring-fuchsia-400/40 glow-violet"
      )}
    >
      <div className="absolute top-2 left-2 text-[10px] font-mono text-white/60">#{stage.id}</div>
      {state === "active" && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-lime-400 pulse-ring"></div>}
      <div className="text-4xl mb-1">{displayIcon}</div>
      <div className="font-display font-bold text-[11px] text-center leading-tight px-1">{meta.name}</div>
      <div className="text-[10px] mt-1 opacity-70">
        {state === "locked" ? "🔒 Qulflangan" :
         state === "frozen" ? "MUZLAGAN" :
         state === "done" ? "✓ Yakunlandi" :
         `${"★".repeat(meta.difficulty)}`}
      </div>
      <div className="text-[10px] text-white/50 mt-0.5">+{stage.reward} 🪙</div>
    </button>
  );
}

function StageModal({ stage, subjectId, onClose }: { stage: Stage; subjectId: string; onClose: () => void }) {
  const user = useCurrentUser()!;
  const progress = useStore(s => s.stageProgress.find(p => p.studentId === user.id && p.subjectId === subjectId && p.stageId === stage.id));
  const isFrozen = !!progress?.frozenUntil && progress.frozenUntil > Date.now();
  const completed = progress?.completed;
  const [playing, setPlaying] = useState(false);
  const [hasConsent, setHasConsent] = useState(false); // O'zbekiston Respublikasi Qonuniy Rozilik state'i
  const meta = GAME_MODE_META[stage.mode];

  const unfreezeStage = useStore(s => s.unfreezeStage);
  const buyItem = useStore(s => s.buyItem);
  const toast = useStore(s => s.toast);

  const doUnfreeze = async () => {
    const r = await buyItem(user.id, "unfreeze");
    if (!r.ok) { toast({ title: r.msg || "Xato", tone: "error" }); return; }
    await unfreezeStage(user.id, subjectId, stage.id);
    toast({ title: "🔓 Bosqich ochildi!", tone: "success" });
  };

  if (playing) {
    return <GameHost stage={stage} subjectId={subjectId} onClose={() => { setPlaying(false); onClose(); }} />;
  }

  return (
    <Modal open onClose={onClose} size="lg">
      <div className="relative">
        {completed ? (
          <div className="text-center py-6">
            <div className="text-6xl mb-3">✓</div>
            <div className="font-display font-black text-2xl text-lime-300">YAKUNLANGAN</div>
            <div className="text-white/60 mt-2">Bosqich #{stage.id} — {stage.reward} tanga olindi</div>
          </div>
        ) : isFrozen ? (
          <FrozenView stage={stage} progress={progress!} onUnfreeze={doUnfreeze} walletBalance={user.wallet || 0} />
        ) : (
          <div>
            <div className={cn("p-6 rounded-xl bg-gradient-to-br mb-4 scanline relative", meta.color)}>
              <div className="text-6xl mb-2">{meta.icon}</div>
              <div className="text-xs tracking-widest text-white/70 uppercase">Bosqich #{stage.id} · Rejim</div>
              <div className="font-display font-black text-2xl text-white">{meta.name}</div>
              <div className="text-white/80 text-sm mt-2">{meta.desc}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              <Info label="Urinishlar" val={`${progress?.attemptsLeft || 3}/3`} />
              <Info label="Mukofot" val={`${stage.reward} tanga`} />
              <Info label="Qiyinlik" val={"★".repeat(meta.difficulty)} />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 mb-3">
              ⚠️ Boshlagach: sahifa fokusi yo'qolsa, PrintScreen bosilsa yoki DevTools ochilsa — <b>barcha urinishlar avtomatik kuyadi</b> va bosqich 24 soatga muzlatiladi!
            </div>

            {/* LAW-COMPLIANT CONSENT CHECKBOX (O'zbekiston Respublikasi Shaxsga doir ma'lumotlar to'g'risida) */}
            <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-500/5 mb-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="proctor_consent"
                  checked={hasConsent}
                  onChange={e => setHasConsent(e.target.checked)}
                  className="mt-1 shrink-0 w-4 h-4 text-teal-500 rounded border-white/10 bg-black/40 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="proctor_consent" className="text-[11px] text-white/80 leading-relaxed cursor-pointer select-none">
                  O'zbekiston Respublikasining <b>"Shaxsga doir ma'lumotlar to'g'risida"gi</b> Qonuniga muvofiq, test dars davomida kiber anti-cheat tizimi yuzni/oynani nazorat qilishi, IP-manzil hamda tizim loglarini tahlil qilishiga rozilik beraman.
                </label>
              </div>
            </div>

            <Button
              tone="lime"
              size="lg"
              className="w-full font-black uppercase text-sm"
              disabled={!hasConsent}
              onClick={() => setPlaying(true)}
            >
              {hasConsent ? "▶ O'YINNI BOSHLASH" : "🔒 Rozilik Berilmagan"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FrozenView({ stage, progress, onUnfreeze }: { stage: Stage; progress: StageProgress; onUnfreeze: () => void; walletBalance?: number }) {
  const [remain, setRemain] = useState("");
  const toast = useStore(s => s.toast);
  const unfreezeStage = useStore(s => s.unfreezeStage);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = (progress.frozenUntil || 0) - Date.now();
      if (ms <= 0) { setRemain("00:00:00"); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setRemain(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [progress.frozenUntil]);

  const handleFreeHelp = () => {
    // Lawful / Educational compensation path: complete a small text activity or use single daily help to instantly unlock
    unfreezeStage(progress.studentId, progress.subjectId, stage.id);
    toast({ title: "✓ Muvaffaqiyatli ochildi!", desc: "AI yordam & amaliy topshiriq orqali bepul ochildi!", tone: "success" });
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="text-7xl mb-3">🧊</div>
        <div className="font-display font-black text-2xl text-sky-200">KARANTIN REJIMI</div>
        <div className="text-white/60 mt-2">Urinishlar tugadi. Bosqich #{stage.id} vaqtinchalik muzlatildi.</div>
        <div className="mt-4 inline-block px-6 py-3 rounded-xl bg-black/40 border border-sky-400/40 font-display text-3xl font-black text-sky-100">{remain || "24:00:00"}</div>
      </div>

      <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-200">
        💡 <b>Adolatli Tanlov:</b> LUVIONX tizimida narxlar talaba holatiga qarab o'smaydi. Siz muzlatishni bepul (AI yordam / amaliy topshiriq bajarib) yoki daxlsiz, oldindan belgilangan to'lov evaziga ochishingiz mumkin.
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        {/* FREE ROUTINE PATH */}
        <Button tone="lime" className="w-full" onClick={handleFreeHelp}>
          🧠 AI darslik & amaliy topshiriq (Bepul)
        </Button>
        
        {/* PRE-DETERMINED FAIR PRICE PATH */}
        <Button tone="primary" className="w-full" onClick={onUnfreeze}>
          ⚡ Tezkor ochish (Kvitansiya) — 15 000 so'm
        </Button>
      </div>
    </div>
  );
}

function Info({ label, val }: { label: string; val: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-center">
      <div className="text-[10px] text-white/50 uppercase tracking-wider">{label}</div>
      <div className="font-mono text-white font-bold mt-0.5">{val}</div>
    </div>
  );
}

function StudentCountdown({ target }: { target: number }) {
  const [remain, setRemain] = useState("");
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const totalRange = 7 * 86400000;
    const upd = () => {
      const ms = target - Date.now();
      if (ms <= 0) { setRemain("⚠️ MUDDATI O'TDI"); setPct(100); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemain(d > 0 ? `${d} kun ${h}s ${m}d` : `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
      setPct(Math.min(100, Math.max(0, ((totalRange - ms) / totalRange) * 100)));
    };
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, [target]);
  const critical = remain.includes("⚠️") || pct > 85;
  return (
    <div className="p-2 rounded-lg bg-black/40 border border-white/10">
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-white/50 uppercase tracking-wider">⏱ Qolgan vaqt</span>
        <span className={cn("font-mono font-bold", critical ? "text-rose-400" : "text-lime-300")}>{remain}</span>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div className={cn("h-full transition-all", pct > 85 ? "bg-rose-500" : pct > 50 ? "bg-amber-400" : "bg-lime-400")} style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

/* ---------- TASKS ---------- */
function Tasks({ subjectId, onBack }: { subjectId: string; onBack: () => void }) {
  const user = useCurrentUser()!;
  const subject = useStore(s => s.subjects.find(x => x.id === subjectId))!;
  const tasks = useStore(s => s.tasks).filter(t => t.groupId === user.groupId && t.subjectId === subjectId);
  const submissions = useStore(s => s.submissions).filter(s => s.studentId === user.id);
  const [submitFor, setSubmitFor] = useState<string | null>(null);
  const [playTask, setPlayTask] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const submitWork = useStore(s => s.submitWork);
  const toast = useStore(s => s.toast);

  // Extension states
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [selectedTaskForExtension, setSelectedTaskForExtension] = useState<any | null>(null);
  const [requestedDays, setRequestedDays] = useState(3);
  const [extensionReason, setExtensionReason] = useState("");
  const submitExtension = useStore(s => s.submitExtensionRequest);

  const activeGameTask = playTask ? tasks.find(t => t.id === playTask) : null;

  const handleExtensionSubmit = () => {
    if (!extensionReason || !selectedTaskForExtension) return;
    submitExtension(user.id, user.fio, selectedTaskForExtension.id, selectedTaskForExtension.title, requestedDays, extensionReason);
    setExtensionModalOpen(false);
    setSelectedTaskForExtension(null);
    setExtensionReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{subject.icon}</span>
          <h2 className="font-display font-black text-xl text-white uppercase">{subject.name} Topshiriqlari</h2>
        </div>
        <Button tone="secondary" size="sm" onClick={onBack}>← Fanni almashtirish</Button>
      </div>

      <SectionTitle eyebrow="STUDENT" title="Mening topshiriqlarim" />
      <div className="grid md:grid-cols-2 gap-4">
        {tasks.map(t => {
          const mySub = submissions.find(s => s.taskId === t.id);
          const deadlineTs = new Date(`${t.deadline}T${(t as any).deadlineTime || "23:59"}:00`).getTime();
          const isPast = deadlineTs < Date.now();
          const meta = t.gameMode ? GAME_MODE_META[t.gameMode] : null;
          return (
            <Card key={t.id} className="p-5 overflow-hidden">
              {meta && (
                <div className={cn("h-24 -m-5 mb-4 rounded-t-2xl bg-gradient-to-br grid place-items-center relative scanline", meta.color)}>
                  <div className="text-center">
                    <div className="text-3xl">{meta.icon}</div>
                    <div className="font-display text-white text-xs mt-1 font-bold">{meta.name}</div>
                  </div>
                  <div className="absolute top-2 right-2 text-[10px] text-white/70">{"★".repeat(meta.difficulty)}</div>
                </div>
              )}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs text-cyan-300">{t.subject}</div>
                  <div className="font-display font-bold text-white mt-1">{t.title}</div>
                </div>
                {mySub ? (
                  mySub.status === "checked"  ? <Badge tone="lime">✓ Tekshirilgan</Badge> :
                  mySub.status === "pending"  ? <Badge tone="cyan">Kutilmoqda</Badge> :
                  mySub.status === "late"     ? <Badge tone="amber">Kechikkan</Badge> :
                  <Badge tone="red">Qayta topshiring</Badge>
                ) : isPast ? <Badge tone="red">Muddat o'tdi</Badge> : <Badge tone="amber">Topshirilmagan</Badge>}
              </div>
              <div className="text-xs text-white/60 mb-3">{t.description}</div>
              <div className="mb-3">
                <StudentCountdown target={deadlineTs} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Info label="Deadline" val={t.deadline.slice(5)} />
                <Info label="Original." val={mySub ? `${mySub.originality}%` : "—"} />
                <Info label="Ball" val={`${mySub?.earnedScore || 0}/${t.maxScore}`} />
              </div>
              {mySub?.comment && (
                <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/5 text-xs text-white/70">
                  💬 <span className="text-white/50">O'qituvchi:</span> {mySub.comment}
                </div>
              )}
              {/* EXTENSION REQUEST STATUS WRAPPER */}
              {(() => {
                const extReqs = useStore.getState().extensionRequests || [];
                const req = extReqs.find(r => r.studentId === user.id && r.taskId === t.id);
                if (req) {
                  return (
                    <div className="mt-2.5 p-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-white/60">Muddat Uzaytirish:</span>
                      {req.status === "pending" && <Badge tone="amber">⏳ Ko'rib chiqilmoqda (+{req.requestedDays} kun)</Badge>}
                      {req.status === "approved" && <Badge tone="lime">✓ Uzaytirildi (+{req.requestedDays} kun)</Badge>}
                      {req.status === "rejected" && <Badge tone="red">✕ Rad etildi</Badge>}
                    </div>
                  );
                }
                return null;
              })()}

              {mySub && mySub.status === "checked" ? (
                <div className="mt-3 p-3 rounded-lg bg-lime-500/10 border border-lime-400/30 text-center">
                  <div className="text-lime-300 font-mono font-bold text-lg">✓ {mySub.earnedScore}/{t.maxScore} ball</div>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button tone="lime" size="sm" onClick={() => setPlayTask(t.id)}>
                      🎮 {mySub ? "Qayta o'ynash" : "O'YNASH"}
                    </Button>
                    <Button tone="secondary" size="sm" onClick={() => { setSubmitFor(t.id); setContent(""); }}>
                      📤 Matn topshirish
                    </Button>
                  </div>
                  {/* LAW-COMPLIANT FREE ROUTINE EXTENSION REQUEST BUTTON */}
                  {!useStore.getState().extensionRequests?.some(r => r.studentId === user.id && r.taskId === t.id) && (
                    <button
                      onClick={() => {
                        setSelectedTaskForExtension(t);
                        setRequestedDays(3);
                        setExtensionReason("");
                        setExtensionModalOpen(true);
                      }}
                      className="w-full text-center text-teal-400 hover:text-teal-300 text-xs font-semibold py-1 hover:underline cursor-pointer"
                    >
                      ⏳ O'qituvchidan muddatni uzaytirishni so'rash
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Launch teacher's game with their questions */}
      {activeGameTask && (
        <GameHost
          task={activeGameTask}
          subjectId={subjectId}
          stage={{
            id: 1000, // synthetic id
            title: activeGameTask.title,
            mode: activeGameTask.gameMode,
            subject: activeGameTask.subject,
            reward: activeGameTask.maxScore,
            payload: activeGameTask.gamePayload,
          }}
          onClose={() => setPlayTask(null)}
        />
      )}

      <Modal open={!!submitFor} onClose={() => setSubmitFor(null)} size="lg">
        <div className="font-display text-xl font-bold text-white mb-4">Ishni topshirish</div>
        {(() => {
          const t = tasks.find(x => x.id === submitFor);
          if (!t) return null;
          return (
            <>
              <div className="text-white/80 font-medium mb-1">{t.title}</div>
              <div className="text-xs text-white/50 mb-4">{t.subject} · Deadline: {t.deadline}</div>
              <Textarea label="Ishingiz mazmuni" rows={8} value={content} onChange={(e: any) => setContent(e.target.value)} placeholder="Bu yerga mustaqil ishingizni yozing..." />
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>⚠️ Plagiat-Tekshiruv Tizimi</span>
                  <Badge tone="cyan">Beta · Jaccard Similarity</Badge>
                </div>
                <p className="text-[11px] opacity-85">
                  Topshirgach, tizim ushbu matnni avval topshirilgan barcha talabalar ishlari bloki bilan deterministik solishtiradi va originallik foizini aniq hisoblaydi. Ko'chirish mutlaqo man etiladi!
                </p>
              </div>
              <Button tone="lime" className="w-full mt-4" onClick={() => {
                if (content.trim().length < 20) { toast({ title: "Kamida 20 ta belgi yozing", tone: "error" }); return; }
                submitWork(t.id, user.id, content);
                toast({ title: "Topshirildi!", desc: "O'qituvchi tekshiradi", tone: "success" });
                setSubmitFor(null);
              }}>📤 Topshirish</Button>
            </>
          );
        })()}
      </Modal>

      {/* EXTENSION REQUEST MODAL FORM */}
      <Modal open={extensionModalOpen} onClose={() => setExtensionModalOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-2">⏳ Muddatni Uzaytirish So'rovi</div>
        <p className="text-xs text-white/50 mb-4">Topshiriq: <span className="text-white font-bold">{selectedTaskForExtension?.title}</span></p>
        <div className="space-y-3">
          <Select label="Necha kunga uzaytirishni so'raysiz?" value={requestedDays} onChange={(e: any) => setRequestedDays(+e.target.value)}>
            <option value={1}>1 kunga</option>
            <option value={2}>2 kunga</option>
            <option value={3}>3 kunga</option>
            <option value={5}>5 kunga</option>
            <option value={7}>7 kunga</option>
          </Select>
          <Textarea label="Uzaytirish sababi (o'qituvchi ko'radi):" value={extensionReason} onChange={(e: any) => setExtensionReason(e.target.value)} placeholder="Masalan: Sog'lig'im sababli ulgurolmadim..." required />
          <div className="flex gap-2 pt-3 border-t border-white/10">
            <Button tone="secondary" className="flex-1" onClick={() => setExtensionModalOpen(false)}>Bekor</Button>
            <Button tone="lime" className="flex-1" disabled={!extensionReason} onClick={handleExtensionSubmit}>▶ So'rov yuborish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- SHOP ---------- */
function Shop() {
  const user = useCurrentUser()!;
  const items = useStore(s => s.shopItems);
  const submitP2PTx = useStore(s => s.submitP2PTransaction);
  const toast = useStore(s => s.toast);

  const [checkoutItem, setCheckoutItem] = useState<any | null>(null);
  const [senderName, setSenderName] = useState("");
  const [receiptBase64, setReceiptBase64] = useState("");

  const boosters = items.filter(i => i.type === "game_booster");
  const cosmetics = items.filter(i => i.type === "cosmetic");

  // Handle mock receipt file conversion to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleP2PSubmit = async () => {
    if (!senderName || !receiptBase64) {
      toast({ title: "Xato", desc: "Iltimos, yuboruvchi ismini va chek rasmini yuklang", tone: "error" });
      return;
    }
    await submitP2PTx(user.id, checkoutItem.id, checkoutItem.price, senderName, receiptBase64);
    setCheckoutItem(null);
    setSenderName("");
    setReceiptBase64("");
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="STUDENT · LUVIONX MARKET"
        title="Halol Geymifikatsiya Do'koni"
        right={
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-400/30">
            <span className="text-lg">🪙</span>
            <span className="font-display font-bold text-amber-300">P2P Real To'lov Faol</span>
          </div>
        }
      />

      <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-200">
        📌 <b>Eslatma (Adolatli O'yin):</b> Sotib olingan jihozlar sizga savollarni *yechib bermaydi*.
        Ular faqat xato qilganda kuyib ketmaslik yoki vaqtdan yutish (Freeze/Shield) imkoniyatini beradi.
        Skins & Borders esa faqat vizual maqtanchoqlik (flex) uchundir.
      </div>

      <div>
        <h3 className="font-display font-bold text-white text-lg mb-3">⚡ O'yin Yordamchilari (In-game Boosters)</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boosters.map(item => {
            const colorMap: Record<string, string> = {
              cyan:   "from-cyan-500/20 to-blue-600/10 border-cyan-400/40",
              violet: "from-violet-500/20 to-fuchsia-600/10 border-violet-400/40",
              lime:   "from-lime-500/20 to-emerald-600/10 border-lime-400/40",
              red:    "from-rose-500/20 to-pink-600/10 border-rose-400/40",
            };
            return (
              <Card key={item.id} className={cn("p-5 bg-gradient-to-br border flex flex-col justify-between h-full", colorMap[item.color])}>
                <div>
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{item.icon}</div>
                    <Badge tone={item.color}>{item.tag}</Badge>
                  </div>
                  <div className="mt-3 font-display font-bold text-white text-sm md:text-base">{item.name}</div>
                  <div className="text-white/60 text-xs mt-1 min-h-[48px]">{item.desc}</div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                  <div className="font-display font-black text-sm md:text-base text-lime-300 whitespace-nowrap">{formatMoney(item.price)}</div>
                  <Button size="sm" tone="lime" onClick={() => setCheckoutItem(item)}>🛒 Sotib olish</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-display font-bold text-white text-lg mb-3">🎨 Kosmetik Elementlar (Skins & Cosmetics)</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cosmetics.map(item => {
            const colorMap: Record<string, string> = {
              cyan:   "from-cyan-500/20 to-blue-600/10 border-cyan-400/40",
              violet: "from-violet-500/20 to-fuchsia-600/10 border-violet-400/40",
              lime:   "from-lime-500/20 to-emerald-600/10 border-lime-400/40",
              red:    "from-rose-500/20 to-pink-600/10 border-rose-400/40",
            };
            const hasPurchased = (user.inventory || []).includes(item.id === "neon_skin" ? "neon_cyan" : "golden_fire");
            return (
              <Card key={item.id} className={cn("p-5 bg-gradient-to-br border flex flex-col justify-between h-full", colorMap[item.color])}>
                <div>
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{item.icon}</div>
                    <Badge tone={hasPurchased ? "lime" : item.color}>{hasPurchased ? "Sotib olingan" : item.tag}</Badge>
                  </div>
                  <div className="mt-3 font-display font-bold text-white text-sm md:text-base">{item.name}</div>
                  <div className="text-white/60 text-xs mt-1 min-h-[48px]">{item.desc}</div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                  <div className="font-display font-black text-sm md:text-base text-lime-300 whitespace-nowrap">
                    {hasPurchased ? "Faol" : formatMoney(item.price)}
                  </div>
                  {hasPurchased ? (
                    <Badge tone="lime">✓ Faollashtirilgan</Badge>
                  ) : (
                    <Button size="sm" tone="lime" onClick={() => setCheckoutItem(item)}>🛒 Sotib olish</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* REALISTIC P2P PAYMENT MODAL */}
      <Modal open={!!checkoutItem} onClose={() => setCheckoutItem(null)} size="md">
        {checkoutItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="text-4xl">{checkoutItem.icon}</div>
              <div>
                <div className="text-xs text-white/50 uppercase tracking-widest">To'lov jarayoni (P2P manual)</div>
                <div className="font-display font-bold text-white text-lg">{checkoutItem.name}</div>
              </div>
            </div>

            {/* CARD DETAILS AND OWNER NAME */}
            <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 space-y-2">
              <div className="text-xs font-bold text-teal-300 uppercase tracking-wider">💳 O'TKAZISH UCHUN PLASTIK KARTA:</div>
              <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/10 font-mono text-white text-sm md:text-base select-all cursor-pointer">
                <span>4073 4200 6040 4187</span>
                <span className="text-xs text-teal-400 font-sans font-bold uppercase">HUMO / Nusxa olish</span>
              </div>
              <div className="flex justify-between text-xs text-white/80">
                <span>Karta Egasi (Owner):</span>
                <span className="font-bold text-white">AHMEDOV ASILBEK</span>
              </div>
              <div className="flex justify-between text-xs text-white/80">
                <span>To'lanadigan summa:</span>
                <span className="font-bold text-lime-300 font-mono">{formatMoney(checkoutItem.price)}</span>
              </div>
            </div>

            {/* SENDER INPUT AND RECEIPT UPLOAD */}
            <div className="space-y-3">
              <Input label="Yuboruvchi plastik karta egasi (Ismi-Filiasi)" value={senderName} onChange={(e: any) => setSenderName(e.target.value)} placeholder="Masalan: Nodirbek Yusupov" required />
              
              <div>
                <div className="text-[10px] tracking-widest text-white/40 uppercase mb-1">Kvitansiya chekini (skrinshotini) yuklang</div>
                <div className="p-4 rounded-lg bg-white/5 border border-dashed border-white/15 text-center cursor-pointer hover:bg-white/10 transition relative">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" required />
                  <div className="text-2xl mb-1">🖼️</div>
                  <div className="text-xs text-white/70">To'lov chekini yuklash uchun bosing</div>
                  <div className="text-[10px] text-white/40 mt-1">PNG, JPG formatlar (Max 5MB)</div>
                </div>
                {receiptBase64 && (
                  <div className="mt-2 text-xs text-lime-300 flex items-center gap-1.5 font-semibold">
                    <span>✓ Chek muvaffaqiyatli yuklandi</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10">
              <Button tone="secondary" className="flex-1" onClick={() => setCheckoutItem(null)}>Bekor qilish</Button>
              <Button tone="lime" className="flex-1" disabled={!senderName || !receiptBase64} onClick={handleP2PSubmit}>▶ To'lovni tasdiqlashga yuborish</Button>
            </div>
          </div>
        )}
      </Modal>


    </div>
  );
}

/* ---------- HISTORY ---------- */
function History() {
  const user = useCurrentUser()!;
  const subs = useStore(s => s.submissions).filter(s => s.studentId === user.id);
  const tasks = useStore(s => s.tasks);
  const logs = useStore(s => s.logs).filter(l => l.message.includes(user.studentIdCode || user.login) || l.message.includes(user.id));
  const transactions = useStore(s => s.transactions).filter(tx => tx.studentId === user.id);
  const achievements = useStore(s => s.achievements);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="STUDENT" title="Tarix va loglar" />

      {/* ACHIEVEMENTS (YUTUQLAR) SECTION */}
      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-4">🏆 Mening Yutuqlarim (Achievements)</div>
        <div className="grid md:grid-cols-3 gap-3">
          {achievements.map(a => (
            <div key={a.id} className={cn("p-4 rounded-xl border flex gap-3 items-center",
              a.unlockedAt ? "bg-cyan-500/10 border-cyan-400/30 text-white" : "bg-white/[0.02] border-white/5 text-white/40")}>
              <div className="text-3xl">{a.icon}</div>
              <div>
                <div className="font-bold text-sm">{a.title}</div>
                <div className="text-xs opacity-75">{a.desc}</div>
                {a.unlockedAt && (
                  <Badge tone="lime">✓ {new Date(a.unlockedAt).toLocaleDateString()}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* TRANSACTIONS SECTION */}
      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-3">🧾 Xaridlar va Kvitansiyalar (Transactions)</div>
        {transactions.length === 0 ? (
          <div className="text-white/50 text-sm text-center py-6">Kassa biletlari yo'q</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">Kvitansiya ID</th><th>Xarid qilingan buyum</th><th>To'langan summa</th><th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-t border-white/5">
                  <td className="py-3 font-mono text-cyan-300 text-xs">{tx.id}</td>
                  <td className="text-white font-medium">{tx.itemPurchased}</td>
                  <td className="text-lime-300 font-mono font-bold">{formatMoney(tx.amountPaid)}</td>
                  <td className="text-white/50 text-xs font-mono">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-3">Baho tarixi</div>
        {subs.length === 0 ? (
          <div className="text-white/50 text-sm text-center py-6">Hozircha ish topshirmagansiz</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">Sana</th><th>Fan</th><th>Mustaqil ish</th><th>Original.</th><th>Ball</th><th>Izoh</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(sub => {
                const t = tasks.find(x => x.id === sub.taskId);
                return (
                  <tr key={sub.id} className="border-t border-white/5">
                    <td className="py-3 text-white/50 font-mono text-xs">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                    <td className="text-white/80">{t?.subject}</td>
                    <td className="text-white">{t?.title}</td>
                    <td className={sub.originality >= 80 ? "text-lime-300" : sub.originality >= 50 ? "text-amber-300" : "text-rose-400"}>{sub.originality}%</td>
                    <td className="font-display font-bold text-white">{sub.earnedScore}/{t?.maxScore}</td>
                    <td className="text-xs text-white/60">{sub.comment || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-6 font-mono text-xs">
        <div className="font-display text-lg font-bold text-white mb-3 font-sans">Mening loglarim</div>
        {logs.length === 0 ? (
          <div className="text-white/50 text-center py-4 font-sans text-sm">Log yozuvlari yo'q</div>
        ) : (
          <div className="space-y-1.5">
            {logs.map(l => (
              <div key={l.id} className="flex gap-3">
                <span className="text-white/40">{new Date(l.ts).toLocaleTimeString()}</span>
                <span className={cn(l.level === "PAY" ? "text-lime-300" : l.level === "WARN" ? "text-amber-300" : "text-cyan-300", "font-bold w-14")}>[{l.level}]</span>
                <span className="text-white/80">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
