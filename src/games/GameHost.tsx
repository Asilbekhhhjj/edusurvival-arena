import { useEffect, useState, useRef } from "react";
import type { Stage, TaskAssignment, Submission } from "../types";
import { GAME_MODE_META } from "./gameData";
import { Button, Badge } from "../components/UI";
import { cn } from "../utils/cn";
import { useStore, useCurrentUser } from "../store";
import { useCheatDetector } from "../hooks/useCheatDetector";

interface GameProps {
  stage: Stage;
  subjectId: string; // Linked dynamically
  onWin: () => void;
  onLose: (reason: string) => void;
  onProgress: (pct: number) => void;
  isTimeFrozen?: boolean;
}

/**
 * GameHost hosts a game either from a Stage (practice map) OR a Teacher's TaskAssignment.
 * If `task` is provided, teacher's questions are used and completing awards task.maxScore.
 */
export function GameHost({ stage, subjectId, task, onClose }: { stage: Stage; subjectId: string; task?: TaskAssignment; onClose: () => void }) {
  const user = useCurrentUser()!;
  const meta = GAME_MODE_META[stage.mode];
  const startActivity = useStore(s => s.startActivity);
  const updateActivity = useStore(s => s.updateActivity);
  const endActivity = useStore(s => s.endActivity);
  const completeStage = useStore(s => s.completeStage);
  const failAttempt = useStore(s => s.failAttempt);
  const regenPayload = useStore(s => s.regenStagePayload);
  const submitGameTask = useStore(s => s.submitGameTask);
  const toast = useStore(s => s.toast);
  const startTime = useRef(Date.now());

  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const [reason, setReason] = useState<string>("");

  // Premium Booster states dynamically tied to user's profile
  const [userLives, setUserLives] = useState(user.lives || 3);
  const [userShields, setUserShields] = useState(user.shields || 0);
  const [userTimeFreezes, setUserTimeFreezes] = useState(user.timeFreezes || 0);
  const [isTimeFrozen, setIsTimeFrozen] = useState(false);

  // Spend booster in state and sync with store wallet/user
  const spendBooster = (type: "life" | "shield" | "time") => {
    useStore.setState(s => ({
      users: s.users.map(u => {
        if (u.id !== user.id) return u;
        return {
          ...u,
          lives: type === "life" ? Math.max(0, (u.lives || 3) - 1) : u.lives,
          shields: type === "shield" ? Math.max(0, (u.shields || 0) - 1) : u.shields,
          timeFreezes: type === "time" ? Math.max(0, (u.timeFreezes || 0) - 1) : u.timeFreezes,
        };
      })
    }));
    if (type === "life") setUserLives(v => Math.max(0, v - 1));
    if (type === "shield") setUserShields(v => Math.max(0, v - 1));
    if (type === "time") {
      setUserTimeFreezes(v => Math.max(0, v - 1));
      setIsTimeFrozen(true);
      toast({ title: "⏳ Vaqt muzlatildi!", desc: "Taymer 15 soniyaga to'xtadi", tone: "success" });
      setTimeout(() => setIsTimeFrozen(false), 15000);
    }
  };

  useEffect(() => {
    startActivity(user.id, subjectId, stage.id);
    return () => endActivity(user.id);
  }, []);

  useCheatDetector({
    active: result === null,
    onViolation: (t) => {
      toast({ title: "⚠️ Cheat aniqlandi!", desc: t, tone: "error" });
      handleLose("CHEAT: " + t);
    },
  });

  const handleWin = () => {
    if (result) return;
    const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
    if (task) {
      submitGameTask(task.id, user.id, true, timeSpent);
      toast({ title: "🎉 Topshiriq yakunlandi!", desc: `Ball avtomatik hisoblandi`, tone: "success" });
    } else {
      completeStage(user.id, subjectId, stage.id, true);
      toast({ title: "🎉 Yakunlandi!", desc: `+${stage.reward} tanga`, tone: "success" });
    }
    updateActivity(user.id, 100, "won");
    setResult("win");
    setTimeout(() => {
      endActivity(user.id);
      if (!task) regenPayload(stage.id);
      onClose();
    }, 2500);
  };

  const handleLose = async (r: string) => {
    if (result) return;
    const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);

    // Apply shield (sug'urta) protection if student has one
    if (userShields > 0) {
      spendBooster("shield");
      const halfScore = task ? Math.round((task.maxScore / 2) * 10) / 10 : 0;
      if (task) {
        // Submit half-points with custom shield rule
        useStore.setState(s => {
          const sub: Submission = {
            id: "sub" + Date.now(),
            taskId: task.id, studentId: user.id,
            content: `[Sug'urtalangan o'yin] Mag'lubiyat · Qalqon qo'llandi`,
            submittedAt: Date.now(),
            originality: 100,
            teacherMark: 2,
            earnedScore: halfScore,
            status: "checked", // marked checked thanks to insurance
            comment: `Avtomatik: Qalqon sug'urtasi ishlatildi. 50% ball (${halfScore} ball) saqlandi.`,
          };
          return {
            submissions: [...s.submissions.filter(x => !(x.taskId === task.id && x.studentId === user.id)), sub],
            users: s.users.map(u => u.id === user.id ? { ...u, totalScore: Math.max(0, Math.min(50, (u.totalScore || 0) + halfScore)) } : u),
          };
        });
        toast({ title: "🛡️ Sug'urta faollashdi!", desc: `O'yin sug'urtalandi. ${halfScore} ball saqlab qolindi.`, tone: "info" });
      }
      updateActivity(user.id, 50, "won");
      setResult("lose");
      setReason(`${r} (🛡️ Tanga Sug'urtasi orqali 50% ball saqlandi)`);
      setTimeout(() => {
        endActivity(user.id);
        onClose();
      }, 3500);
      return;
    }

    if (task) {
      submitGameTask(task.id, user.id, false, timeSpent);
    } else {
      const status = await failAttempt(user.id, subjectId, stage.id);
      if (status === "frozen") r += " · Bosqich muzlatildi!";
    }
    updateActivity(user.id, 0, "lost");
    setResult("lose");
    setReason(r);
    setTimeout(() => {
      endActivity(user.id);
      if (!task) regenPayload(stage.id);
      onClose();
    }, 3200);
  };

  const handleProgress = (pct: number) => {
    updateActivity(user.id, pct);
  };

  const gameProps: GameProps = { stage, subjectId, onWin: handleWin, onLose: handleLose, onProgress: handleProgress, isTimeFrozen };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col overflow-auto">
      {/* Watermark */}
      <div className="pointer-events-none fixed inset-0 grid place-items-center overflow-hidden">
        <div className="font-display text-6xl text-white/[0.03] tracking-widest whitespace-nowrap watermark">
          {user.studentIdCode} · {user.ip}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 h-16 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg grid place-items-center text-xl bg-gradient-to-br", meta.color)}>{meta.icon}</div>
            <div className="min-w-0">
              <div className="font-display font-black text-white text-sm md:text-base truncate">{task ? task.title : stage.title}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50">
                {task ? <>Fan: {task.subject} · </> : null}Rejim: {meta.name} · {"★".repeat(meta.difficulty)}
              </div>
            </div>
          </div>

          {/* HALOL GEOMIFIKATSIYA BOOSTER PANEL (IN-GAME ACTIVE DONATES) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/50 uppercase tracking-wider mr-1">Jihozlarim:</span>
            
            {/* Life Heart */}
            <button
              onClick={() => {
                if (userLives > 0) {
                  spendBooster("life");
                  toast({ title: "❤️ Jon ishlatildi!", desc: "Maksimal imkoniyat oshirildi", tone: "success" });
                }
              }}
              disabled={userLives <= 0}
              className={cn("px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 transition",
                userLives > 0 ? "border-red-400/40 hover:bg-red-500/20 text-red-300" : "border-white/5 opacity-40 text-white/30")}
            >
              ❤️ {userLives}
            </button>

            {/* Time Freeze */}
            <button
              onClick={() => spendBooster("time")}
              disabled={userTimeFreezes <= 0 || isTimeFrozen}
              className={cn("px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 transition",
                userTimeFreezes > 0 && !isTimeFrozen ? "border-cyan-400/40 hover:bg-cyan-500/20 text-cyan-300" : "border-white/5 opacity-40 text-white/30")}
            >
              ⏳ {userTimeFreezes} {isTimeFrozen && "(Muzlatilgan)"}
            </button>

            {/* Shield Auto Protect indicator */}
            <div className={cn("px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 cursor-help",
              userShields > 0 ? "border-violet-400/40 text-violet-300 bg-violet-500/10" : "border-white/5 opacity-40 text-white/30")}
              title="Yutqazsangiz, qalqon avtomatik 50% ballingizni saqlab qoladi"
            >
              🛡️ {userShields} {userShields > 0 && "(Aktiv)"}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge tone="lime">{task ? `${task.maxScore} ball` : `${stage.reward} 🪙`}</Badge>
            <Badge tone="red">🔴 REC</Badge>
            <button onClick={onClose} className="text-white/50 hover:text-white text-xl w-10 h-10 grid place-items-center rounded hover:bg-white/10">×</button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 p-6 max-w-5xl mx-auto w-full">
        {result === "win" ? (
          <div className="grid place-items-center h-full">
            <div className="text-center">
              <div className="text-8xl mb-4 float-y">🎉</div>
              <div className="font-display font-black text-4xl bg-gradient-to-r from-lime-300 to-cyan-300 bg-clip-text text-transparent">G'ALABA!</div>
              <div className="text-white/60 mt-3">Bosqich #{stage.id} yakunlandi</div>
              <div className="font-display text-2xl text-lime-300 mt-4">+{stage.reward} 🪙</div>
            </div>
          </div>
        ) : result === "lose" ? (
          <div className="grid place-items-center h-full">
            <div className="text-center">
              <div className="text-8xl mb-4">💀</div>
              <div className="font-display font-black text-4xl text-rose-300">MAG'LUB</div>
              <div className="text-white/70 mt-3">{reason}</div>
            </div>
          </div>
        ) : (
          <GameRouter {...gameProps} />
        )}
      </main>
    </div>
  );
}

function GameRouter(p: GameProps) {
  switch (p.stage.mode) {
    case "dark_maze":      return <DarkMazeGame {...p} />;
    case "time_bomb":      return <TimeBombGame {...p} />;
    case "crypto_breaker": return <CryptoGame {...p} />;
    case "chain_reaction": return <ChainReactionGame {...p} />;
    case "boss_fight":     return <BossFightGame {...p} />;
    case "deep_dive":      return <DeepDiveGame {...p} />;
    case "minesweeper":    return <MinesweeperGame {...p} />;
    case "blueprint":      return <BlueprintGame {...p} />;
    case "pvp_arena":      return <PvpGame {...p} />;
    case "bug_hunter":     return <BugHunterGame {...p} />;
    case "hardcore":       return <HardcoreGame {...p} />;
    case "tower_defense":  return <TowerDefenseGame {...p} />;
    case "evolving":       return <EvolvingGame {...p} />;
    case "paradox":        return <ParadoxGame {...p} />;
    case "judgment":       return <JudgmentGame {...p} />;
  }
}

/* ==================== 1. DARK MAZE ==================== */
function DarkMazeGame({ stage, onWin, onLose, onProgress, isTimeFrozen }: GameProps) {
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const qs = stage.payload.questions;

  useEffect(() => {
    if (timeLeft <= 0) { onLose("Vaqt tugadi"); return; }
    if (isTimeFrozen) return; // Freeze countdown
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isTimeFrozen]);

  const answer = (i: number) => {
    if (i === qs[round].correct) {
      const next = round + 1;
      onProgress(((next) / qs.length) * 100);
      if (next >= qs.length) onWin();
      else setRound(next);
    } else {
      setTimeLeft(v => Math.max(0, v - 15));
    }
  };

  const q = qs[round];
  const revealed = round + 1;

  return (
    <div className="max-w-3xl mx-auto">
      <TopStrip label="Vaqt" val={`${timeLeft}s`} progress={(round/qs.length)*100} extra={`Bosqich ${round+1}/${qs.length}`} />
      <div className="mt-6 grid grid-cols-4 gap-2">
        {qs.map((_: any, i: number) => (
          <div key={i} className={cn("aspect-square rounded-lg border-2 grid place-items-center text-3xl transition-all",
            i < round ? "bg-lime-500/20 border-lime-400/60 text-lime-300" :
            i === round ? "bg-cyan-500/20 border-cyan-400/60 text-white glow-cyan animate-pulse" :
            i < revealed ? "bg-white/10 border-white/20 text-white/50" :
            "bg-black/40 border-white/5 text-white/10"
          )}>
            {i < round ? "✓" : i === round ? "🚪" : "🌑"}
          </div>
        ))}
      </div>
      <div className="mt-6 p-5 rounded-xl bg-black/50 border border-white/10">
        <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Yo'lni yoritish uchun to'g'ri javob bering</div>
        <div className="text-white text-lg mb-4 select-none">{q.q}</div>
        <div className="grid md:grid-cols-2 gap-2">
          {q.options.map((o: string, i: number) => (
            <button key={i} onClick={() => answer(i)}
              className="text-left p-3 rounded-lg bg-white/[0.03] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-white/90 select-none transition">
              <span className="font-mono text-cyan-300 mr-3">{String.fromCharCode(65+i)}.</span>{o}
            </button>
          ))}
        </div>
        <div className="text-xs text-rose-300 mt-3">⚠️ Xato javob = -15 sekund</div>
      </div>
    </div>
  );
}

/* ==================== 2. TIME BOMB ==================== */
function TimeBombGame({ stage, onWin, onLose, onProgress, isTimeFrozen }: GameProps) {
  const [timeLeft, setTimeLeft] = useState(stage.payload.seconds);
  useEffect(() => {
    if (timeLeft <= 0) { onLose("💣 Bomba portladi!"); return; }
    if (isTimeFrozen) return; // Freeze countdown
    const t = setTimeout(() => { setTimeLeft((v: number) => v - 1); onProgress(((stage.payload.seconds - timeLeft) / stage.payload.seconds) * 100); }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isTimeFrozen]);

  const pct = (timeLeft / stage.payload.seconds) * 100;

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className={cn("text-8xl mb-4 transition-all", timeLeft <= 5 && "animate-bounce")}>💣</div>
      <div className={cn("font-display font-black text-6xl", timeLeft <= 10 ? "text-rose-400" : "text-white")}>{timeLeft}s</div>
      <div className="h-3 bg-white/10 rounded-full mt-4 overflow-hidden">
        <div className={cn("h-full transition-all", pct > 50 ? "bg-lime-400" : pct > 20 ? "bg-amber-400" : "bg-rose-500")} style={{ width: `${pct}%` }}/>
      </div>
      <div className="mt-8 p-6 rounded-xl bg-black/50 border-2 border-rose-400/40">
        <div className="text-xs text-rose-300 mb-3 tracking-widest">DEFUZATSIYA KODI</div>
        <div className="text-white text-2xl font-mono mb-6 select-none">{stage.payload.q}</div>
        <div className="grid grid-cols-2 gap-3">
          {stage.payload.options.map((o: string, i: number) => (
            <button key={i} onClick={() => i === stage.payload.correctIndex ? onWin() : onLose("Noto'g'ri kod — bomba portladi")}
              className="p-4 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-white font-mono text-lg select-none">
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== 3. CRYPTO BREAKER ==================== */
function CryptoGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [input, setInput] = useState("");
  const [tries, setTries] = useState(3);
  const target = stage.payload.answer;

  const submit = () => {
    onProgress(((3 - tries) / 3) * 100);
    if (input.toUpperCase().trim() === target) onWin();
    else {
      const t = tries - 1;
      setTries(t);
      if (t <= 0) onLose("Shifr topilmadi");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <TopStrip label="Urinishlar" val={`${tries}/3`} progress={((3-tries)/3)*100} />
      <div className="mt-6 p-6 rounded-xl bg-black/50 border border-emerald-400/40">
        <div className="text-xs text-emerald-300 mb-3 tracking-widest">CAESAR SHIFRI · Kalit siljish: {stage.payload.shift}</div>
        <div className="text-center py-6">
          <div className="text-white/50 text-sm mb-2">Shifrlangan matn:</div>
          <div className="font-display font-black text-5xl text-emerald-300 tracking-widest select-none">{stage.payload.encoded}</div>
        </div>
        <div className="text-white/70 text-sm mb-3">💡 Har harfni {stage.payload.shift} pozitsiya orqaga suring (A ← D)</div>
        <input value={input} onChange={e => setInput(e.target.value.toUpperCase())}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-emerald-400/40 text-white text-xl font-mono tracking-widest text-center focus:outline-none focus:border-emerald-400"
          placeholder="JAVOB..." maxLength={target.length} />
        <Button tone="lime" className="w-full mt-3" onClick={submit}>🔓 Ochish</Button>
      </div>
    </div>
  );
}

/* ==================== 4. CHAIN REACTION ==================== */
function ChainReactionGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [chain, setChain] = useState(0);
  const qs = stage.payload.chain;

  const answer = (i: number) => {
    if (i === qs[chain].correct) {
      const n = chain + 1;
      onProgress((n / qs.length) * 100);
      if (n >= qs.length) onWin();
      else setChain(n);
    } else {
      onLose(`Zanjir uzildi (Bosqich ${chain+1}). Barcha oldingi javoblar yondi!`);
    }
  };

  const q = qs[chain];

  return (
    <div className="max-w-2xl mx-auto">
      <TopStrip label="Zanjir" val={`${chain}/${qs.length}`} progress={(chain/qs.length)*100} />
      <div className="mt-6 flex items-center justify-center gap-3 py-4">
        {qs.map((_: any, i: number) => (
          <div key={i} className="flex items-center">
            <div className={cn("w-12 h-12 rounded-full grid place-items-center text-xl border-2",
              i < chain ? "bg-lime-500/30 border-lime-400 text-lime-300" :
              i === chain ? "bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse" :
              "bg-white/5 border-white/20 text-white/30"
            )}>{i < chain ? "⛓" : i === chain ? "?" : "○"}</div>
            {i < qs.length - 1 && <div className={cn("w-6 h-0.5", i < chain ? "bg-lime-400" : "bg-white/10")} />}
          </div>
        ))}
      </div>
      <div className="p-6 rounded-xl bg-black/50 border border-amber-400/40">
        <div className="text-white text-lg mb-4 select-none">{q.q}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o: string, i: number) => (
            <button key={i} onClick={() => answer(i)}
              className="p-3 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-white/90 select-none text-left">
              <span className="font-mono text-amber-300 mr-3">{String.fromCharCode(65+i)}.</span>{o}
            </button>
          ))}
        </div>
        <div className="text-xs text-rose-300 mt-3">⚠️ Bitta xato = butun zanjir yonadi!</div>
      </div>
    </div>
  );
}

/* ==================== 5. BOSS FIGHT ==================== */
function BossFightGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [phase, setPhase] = useState(0);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(3);
  const phases = stage.payload.phases;

  const attack = (i: number) => {
    if (i === phases[phase].correct) {
      const dmg = 34;
      const newHp = bossHp - dmg;
      setBossHp(Math.max(0, newHp));
      onProgress(((100 - Math.max(0, newHp)) / 100) * 100);
      setTimeout(() => {
        if (newHp <= 0) onWin();
        else if (phase < phases.length - 1) setPhase(phase + 1);
      }, 500);
    } else {
      const p = playerHp - 1;
      setPlayerHp(p);
      if (p <= 0) onLose("Boss sizni mag'lub etdi");
    }
  };

  const q = phases[phase];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1"><span className="text-rose-300 font-bold">👹 BOSS HP</span><span className="font-mono text-white">{bossHp}/100</span></div>
          <div className="h-3 bg-black/50 rounded-full overflow-hidden border border-rose-400/30">
            <div className="h-full bg-gradient-to-r from-rose-600 to-red-500 transition-all" style={{ width: `${bossHp}%` }}/>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1"><span className="text-lime-300 font-bold">❤️ SIZNING HP</span><span className="font-mono text-white">{playerHp}/3</span></div>
          <div className="flex gap-1">
            {[1,2,3].map(i => <div key={i} className={cn("flex-1 h-3 rounded-full", i <= playerHp ? "bg-lime-400" : "bg-white/10")}/>)}
          </div>
        </div>
      </div>

      <div className="text-center py-6">
        <div className={cn("text-9xl inline-block transition-all", bossHp < 50 && "animate-bounce")}>👹</div>
      </div>

      <div className="p-6 rounded-xl bg-black/50 border-2 border-fuchsia-400/40">
        <div className="text-xs text-fuchsia-300 tracking-widest mb-2">FAZA {phase + 1}/{phases.length}</div>
        <div className="text-white text-lg mb-4 select-none">{q.q}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o: string, i: number) => (
            <button key={i} onClick={() => attack(i)}
              className="p-3 rounded-lg bg-white/5 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-400/40 text-white/90 select-none text-left">
              ⚔️ {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== 6. DEEP DIVE ==================== */
function DeepDiveGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const facts = stage.payload.facts;

  const toggle = (i: number) => {
    const n = new Set(selected);
    if (n.has(i)) n.delete(i); else n.add(i);
    setSelected(n);
    onProgress((n.size / facts.filter((f: any) => f.truth).length) * 50);
  };

  const submit = () => {
    let correct = 0, wrong = 0;
    facts.forEach((f: any, i: number) => {
      if (selected.has(i) && f.truth) correct++;
      if (selected.has(i) && !f.truth) wrong++;
      if (!selected.has(i) && f.truth) wrong++;
    });
    if (wrong === 0) onWin();
    else onLose(`${wrong} ta xato tanlov`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <TopStrip label="Tanlangan" val={`${selected.size}/${facts.length}`} progress={(selected.size / facts.length) * 100} />
      <div className="mt-6 space-y-2">
        <div className="text-white/80 mb-3">📜 Faqat <b>rost</b> faktlarni tanlang:</div>
        {facts.map((f: any, i: number) => (
          <button key={i} onClick={() => toggle(i)}
            className={cn("w-full text-left p-4 rounded-lg border-2 transition select-none",
              selected.has(i) ? "bg-amber-500/20 border-amber-400/60 text-white" : "bg-white/[0.03] border-white/10 text-white/70 hover:border-white/30")}>
            <div className="flex items-center gap-3">
              <div className={cn("w-6 h-6 rounded border-2 grid place-items-center", selected.has(i) ? "bg-amber-400 border-amber-300" : "border-white/30")}>
                {selected.has(i) && "✓"}
              </div>
              <div>{f.text}</div>
            </div>
          </button>
        ))}
      </div>
      <Button tone="lime" className="w-full mt-4" onClick={submit}>🏺 Qazishni yakunlash</Button>
    </div>
  );
}

/* ==================== 7. MINESWEEPER QUIZ ==================== */
function MinesweeperGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const needed = stage.payload.needed;
  const cells = stage.payload.options;

  const pick = (i: number) => {
    if (picked.has(i)) return;
    if (!cells[i].safe) { onLose(`💥 MINA! "${cells[i].text}"`); return; }
    const n = new Set(picked); n.add(i);
    setPicked(n);
    onProgress((n.size / needed) * 100);
    if (n.size >= needed) onWin();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <TopStrip label="Xavfsiz" val={`${picked.size}/${needed}`} progress={(picked.size / needed) * 100} />
      <div className="mt-4 p-4 rounded-xl bg-black/50 border border-white/10 text-center">
        <div className="text-white text-lg select-none">{stage.payload.q}</div>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {cells.map((c: any, i: number) => (
          <button key={i} onClick={() => pick(i)} disabled={picked.has(i)}
            className={cn("aspect-square rounded-lg border-2 p-2 text-sm font-semibold select-none transition-all",
              picked.has(i) ? "bg-lime-500/30 border-lime-400 text-lime-100" : "bg-slate-800/60 border-slate-600/40 text-white hover:border-cyan-400/40 hover:scale-105")}>
            {picked.has(i) ? "✓ " + c.text : c.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== 8. BLUEPRINT ==================== */
function BlueprintGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [pool, setPool] = useState<string[]>(stage.payload.shuffled);
  const [built, setBuilt] = useState<string[]>([]);
  const target = stage.payload.target;

  const pushToBuilt = (i: number) => {
    const item = pool[i];
    setBuilt(b => [...b, item]);
    setPool(p => p.filter((_, idx) => idx !== i));
    onProgress(((built.length + 1) / target.length) * 100);
  };
  const undo = (i: number) => {
    setPool(p => [...p, built[i]]);
    setBuilt(b => b.filter((_, idx) => idx !== i));
  };
  const check = () => {
    if (JSON.stringify(built) === JSON.stringify(target)) onWin();
    else onLose("Formula noto'g'ri qurildi");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <TopStrip label="Elementlar" val={`${built.length}/${target.length}`} progress={(built.length/target.length)*100} />
      <div className="mt-6 p-6 rounded-xl bg-black/50 border-2 border-blue-400/40 min-h-[80px]">
        <div className="text-xs text-blue-300 mb-3 tracking-widest">SIZNING FORMULA</div>
        <div className="flex flex-wrap gap-2">
          {built.length === 0 && <div className="text-white/30 italic">Quyidagi elementlardan foydalanib formulani tuzing</div>}
          {built.map((el, i) => (
            <button key={i} onClick={() => undo(i)} className="px-3 py-1.5 rounded-lg bg-blue-500/30 border border-blue-400 text-white font-mono hover:bg-rose-500/30 hover:border-rose-400">
              {el}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="text-xs text-white/50 mb-3 tracking-widest">MAVJUD ELEMENTLAR</div>
        <div className="flex flex-wrap gap-2">
          {pool.map((el, i) => (
            <button key={i} onClick={() => pushToBuilt(i)} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-mono hover:bg-blue-500/20 hover:border-blue-400">
              {el}
            </button>
          ))}
        </div>
      </div>
      <Button tone="lime" className="w-full mt-4" onClick={check} disabled={pool.length > 0}>📐 Formulani tekshirish</Button>
    </div>
  );
}

/* ==================== 9. PVP ARENA ==================== */
function PvpGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [myProgress, setMyProgress] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [answered, setAnswered] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const opp = Math.min(100, (elapsed / stage.payload.opponentDelay) * 100);
      setOppProgress(opp);
      if (opp >= 100 && !answered) {
        onLose("Raqib g'olib bo'ldi!");
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  const answer = (i: number) => {
    setAnswered(true);
    if (i === stage.payload.correctIndex) {
      setMyProgress(100);
      onProgress(100);
      setTimeout(onWin, 400);
    } else onLose("Noto'g'ri javob");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-center mb-2 text-lime-300 font-bold">🎮 SIZ</div>
          <div className="h-6 rounded-full bg-white/10 overflow-hidden border border-lime-400/30">
            <div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all" style={{ width: `${myProgress}%` }}/>
          </div>
        </div>
        <div>
          <div className="text-center mb-2 text-rose-300 font-bold">👤 RAQIB</div>
          <div className="h-6 rounded-full bg-white/10 overflow-hidden border border-rose-400/30">
            <div className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all" style={{ width: `${oppProgress}%` }}/>
          </div>
        </div>
      </div>
      <div className="p-6 rounded-xl bg-black/50 border-2 border-rose-400/40">
        <div className="text-xs text-rose-300 tracking-widest mb-3">⚔️ REAL VAQTDAGI POYGA</div>
        <div className="text-white text-2xl mb-4 select-none">{stage.payload.q}</div>
        <div className="grid grid-cols-2 gap-3">
          {stage.payload.options.map((o: string, i: number) => (
            <button key={i} onClick={() => answer(i)} disabled={answered}
              className="p-4 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-white text-lg font-mono select-none">{o}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== 10. BUG HUNTER ==================== */
function BugHunterGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const lines = stage.payload.code.split("\n");
  const [tries, setTries] = useState(3);

  const check = (i: number) => {
    onProgress(((3 - tries) / 3) * 100);
    if (i === stage.payload.bugLine) onWin();
    else {
      const t = tries - 1;
      setTries(t);
      if (t <= 0) onLose("Bug topilmadi (3 xato)");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <TopStrip label="Urinishlar" val={`${tries}/3`} progress={((3-tries)/3)*100} />
      <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 text-sm">💡 {stage.payload.hint}</div>
      <div className="mt-4 p-4 rounded-xl bg-black/70 border border-emerald-400/40 font-mono text-sm">
        <div className="text-xs text-emerald-300 mb-2 tracking-widest">🐛 KOD (buggan qatorni toping)</div>
        {lines.map((line: string, i: number) => (
          <button key={i} onClick={() => check(i)} className="w-full flex hover:bg-emerald-500/20 rounded px-2 py-0.5 text-left group select-none">
            <span className="text-white/30 w-8 text-right pr-2 group-hover:text-emerald-300">{i}</span>
            <span className="text-emerald-200 flex-1 whitespace-pre">{line || " "}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== 11. HARDCORE ==================== */
function HardcoreGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(stage.payload.lives);
  const qs = stage.payload.questions;

  const answer = (i: number) => {
    if (i === qs[idx].correct) {
      const n = idx + 1;
      onProgress((n / qs.length) * 100);
      if (n >= qs.length) onWin();
      else setIdx(n);
    } else {
      const l = lives - 1;
      setLives(l);
      if (l <= 0) onLose("Barcha hayotlar tugadi");
      else { setIdx(0); onProgress(0); }
    }
  };

  const q = qs[idx];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-1">
          {Array.from({ length: stage.payload.lives }).map((_, i) => (
            <div key={i} className="text-2xl">{i < lives ? "❤️" : "🖤"}</div>
          ))}
        </div>
        <Badge tone="red">HARDCORE · Xato = boshiga qaytish</Badge>
      </div>
      <TopStrip label="Level" val={`${idx+1}/${qs.length}`} progress={(idx/qs.length)*100} />
      <div className="mt-6 p-6 rounded-xl bg-black/50 border-2 border-red-700">
        <div className="text-white text-lg mb-4 select-none">{q.q}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o: string, i: number) => (
            <button key={i} onClick={() => answer(i)}
              className="p-3 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-white/90 select-none text-left">
              <span className="font-mono text-red-300 mr-3">{String.fromCharCode(65+i)}.</span>{o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== 12. TOWER DEFENSE ==================== */
function TowerDefenseGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [wave, setWave] = useState(0);
  const [hp, setHp] = useState(stage.payload.maxHp);
  const qs = stage.payload.questions;

  const answer = (i: number) => {
    if (i === qs[wave].correct) {
      const n = wave + 1;
      onProgress((n / qs.length) * 100);
      if (n >= qs.length) onWin();
      else setWave(n);
    } else {
      const h = hp - 34;
      setHp(Math.max(0, h));
      if (h <= 0) onLose("Minora buzildi");
    }
  };

  const q = qs[wave];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="font-display text-cyan-300 font-bold">🏰 MINORA HP</div>
        <div className="font-mono text-white">{hp}/{stage.payload.maxHp}</div>
      </div>
      <div className="h-4 rounded-full bg-black/50 overflow-hidden border border-cyan-400/30 mb-4">
        <div className={cn("h-full transition-all", hp > 60 ? "bg-cyan-400" : hp > 30 ? "bg-amber-400" : "bg-rose-500")} style={{ width: `${(hp/stage.payload.maxHp)*100}%` }}/>
      </div>
      <TopStrip label="To'lqin" val={`${wave+1}/${qs.length}`} progress={(wave/qs.length)*100} />
      <div className="mt-4 text-center text-6xl py-4">
        <span className="inline-block">🏰</span>
        <span className="inline-block mx-4">🛡️</span>
        <span className="inline-block animate-pulse">👾</span>
      </div>
      <div className="p-6 rounded-xl bg-black/50 border-2 border-cyan-400/40">
        <div className="text-xs text-cyan-300 tracking-widest mb-2">TO'LQIN {wave+1} · Dushmanni to'xtating!</div>
        <div className="text-white text-lg mb-4 select-none">{q.q}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o: string, i: number) => (
            <button key={i} onClick={() => answer(i)}
              className="p-3 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-white/90 select-none text-left">
              🎯 {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== 13. EVOLVING ==================== */
function EvolvingGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [level, setLevel] = useState(0);
  const [tries, setTries] = useState(3);
  const qs = stage.payload.questions;

  const answer = (i: number) => {
    if (i === qs[level].correct) {
      const n = level + 1;
      onProgress((n / qs.length) * 100);
      if (n >= qs.length) onWin();
      else setLevel(n);
    } else {
      const t = tries - 1;
      setTries(t);
      if (t <= 0) onLose(`Level ${level+1}da to'xtadingiz`);
    }
  };

  const q = qs[level];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">🧬</div>
        <div className="flex justify-center gap-1">
          {qs.map((_: any, i: number) => (
            <div key={i} className={cn("w-8 h-1 rounded-full", i < level ? "bg-violet-400" : i === level ? "bg-fuchsia-400 animate-pulse" : "bg-white/10")}/>
          ))}
        </div>
      </div>
      <TopStrip label={`Level ${level+1}`} val={`Qiyinlik: ${"★".repeat(q.difficulty)}`} progress={(level/qs.length)*100} extra={`${tries} urinish`} />
      <div className="mt-4 p-6 rounded-xl bg-black/50 border-2 border-violet-400/40">
        <div className="text-white text-lg mb-4 select-none">{q.q}</div>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o: string, i: number) => (
            <button key={i} onClick={() => answer(i)}
              className="p-3 rounded-lg bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-400/40 text-white/90 select-none text-left">
              <span className="font-mono text-violet-300 mr-3">{String.fromCharCode(65+i)}.</span>{o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==================== 14. PARADOX ==================== */
function ParadoxGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const submit = () => {
    if (selected === null) return;
    onProgress(100);
    if (selected === stage.payload.correctIndex) onWin();
    else onLose("Paradoksni to'g'ri talqin qilmadingiz");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-8xl">♾️</div>
        <div className="text-white/70 mt-2">Bu jumboqning mantiqan yagona javobi bor</div>
      </div>
      <div className="p-6 rounded-xl bg-black/50 border-2 border-indigo-400/40 mb-4">
        <div className="text-xs text-indigo-300 tracking-widest mb-3">SSENARIY</div>
        <div className="text-white text-lg italic select-none">{stage.payload.scenario}</div>
      </div>
      <div className="space-y-2">
        {stage.payload.options.map((o: string, i: number) => (
          <button key={i} onClick={() => setSelected(i)}
            className={cn("w-full text-left p-4 rounded-lg border-2 transition select-none",
              selected === i ? "bg-indigo-500/30 border-indigo-400 text-white" : "bg-white/[0.03] border-white/10 text-white/70 hover:border-white/30")}>
            <span className="font-mono text-indigo-300 mr-3">{String.fromCharCode(65+i)}.</span>{o}
          </button>
        ))}
      </div>
      <Button tone="lime" className="w-full mt-4" disabled={selected === null} onClick={submit}>♾️ Javobni tasdiqlash</Button>
    </div>
  );
}

/* ==================== 15. JUDGMENT ==================== */
function JudgmentGame({ stage, onWin, onLose, onProgress }: GameProps) {
  const [pros, setPros] = useState<Set<number>>(new Set());
  const [cons, setCons] = useState<Set<number>>(new Set());

  useEffect(() => {
    const total = stage.payload.pros.length + stage.payload.cons.length;
    onProgress(((pros.size + cons.size) / total) * 100);
  }, [pros, cons]);

  const submit = () => {
    let wrong = 0;
    stage.payload.pros.forEach((p: any, i: number) => {
      if (pros.has(i) && !p.valid) wrong++;
      if (!pros.has(i) && p.valid) wrong++;
    });
    stage.payload.cons.forEach((c: any, i: number) => {
      if (cons.has(i) && !c.valid) wrong++;
      if (!cons.has(i) && c.valid) wrong++;
    });
    if (wrong === 0) onWin();
    else onLose(`${wrong} ta noto'g'ri tanlov`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="p-4 rounded-xl bg-black/50 border border-amber-400/40 mb-4 text-center">
        <div className="text-3xl mb-2">⚖️</div>
        <div className="text-xs text-amber-300 tracking-widest mb-2">SUD ISHI</div>
        <div className="text-white text-lg select-none">{stage.payload.case}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-lime-300 font-bold mb-2">✓ HIMOYA (rost argumentlarni tanlang)</div>
          <div className="space-y-2">
            {stage.payload.pros.map((p: any, i: number) => (
              <button key={i} onClick={() => {
                const n = new Set(pros); n.has(i) ? n.delete(i) : n.add(i); setPros(n);
              }} className={cn("w-full text-left p-3 rounded-lg border-2 text-sm select-none",
                pros.has(i) ? "bg-lime-500/20 border-lime-400 text-white" : "bg-white/[0.03] border-white/10 text-white/70")}>
                {pros.has(i) && "✓ "}{p.text}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-rose-300 font-bold mb-2">✗ QORALASH (rost argumentlarni tanlang)</div>
          <div className="space-y-2">
            {stage.payload.cons.map((c: any, i: number) => (
              <button key={i} onClick={() => {
                const n = new Set(cons); n.has(i) ? n.delete(i) : n.add(i); setCons(n);
              }} className={cn("w-full text-left p-3 rounded-lg border-2 text-sm select-none",
                cons.has(i) ? "bg-rose-500/20 border-rose-400 text-white" : "bg-white/[0.03] border-white/10 text-white/70")}>
                {cons.has(i) && "✓ "}{c.text}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Button tone="lime" className="w-full mt-4" onClick={submit}>⚖️ Hukm chiqarish</Button>
    </div>
  );
}

/* ==================== SHARED ==================== */
function TopStrip({ label, val, progress, extra }: { label: string; val: string; progress: number; extra?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="text-white/60 uppercase tracking-wider text-xs">{label}: <span className="text-white font-mono font-bold ml-1">{val}</span></span>
        {extra && <span className="text-white/60 text-xs">{extra}</span>}
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-lime-400 transition-all" style={{ width: `${progress}%` }}/>
      </div>
    </div>
  );
}
