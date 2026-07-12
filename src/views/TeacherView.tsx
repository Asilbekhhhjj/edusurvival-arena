import { useState, useEffect } from "react";
import { Card, SectionTitle, Stat, Badge, Button, Input, Textarea, Select, Modal, ZoneChip } from "../components/UI";
import { useStore, useCurrentUser, zoneOf } from "../store";
import type { Submission, GameMode } from "../types";
import { GAME_MODE_META } from "../games/gameData";
import { QuestionEditor, defaultPayload } from "../games/QuestionEditor";
import { cn } from "../utils/cn";

export function TeacherView({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  if (page === "tasks")    return <Tasks />;
  if (page === "grading")  return <Grading />;
  if (page === "criteria") return <Criteria />;
  if (page === "students") return <StudentsRating />;
  if (page === "realtime") return <RealtimeMonitor />;
  if (page === "extensions") return <ExtensionRequestsView />;
  return <Overview setPage={setPage} />;
}

function RealtimeMonitor() {
  const { students } = useMyData();
  const activities = useStore(s => s.activities);
  const stages = useStore(s => s.stages);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 500);
    return () => clearInterval(t);
  }, []);

  const active = students.map(st => {
    const act = activities.find(a => a.studentId === st.id);
    return { student: st, activity: act };
  });

  const playingCount = active.filter(a => a.activity?.status === "playing").length;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TEACHER · LIVE"
        title="Real-time monitoring"
        right={<div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-lime-400 pulse-ring"></span><Badge tone="lime">{playingCount} ta faol</Badge></div>}
      />

      <Card className="p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-lime-500/10 border border-lime-400/30">
            <div className="text-xs text-lime-300 uppercase tracking-wider">Hozir o'ynayotgan</div>
            <div className="font-display text-3xl font-black text-white mt-1">{playingCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-400/30">
            <div className="text-xs text-cyan-300 uppercase tracking-wider">Umumiy talabalar</div>
            <div className="font-display text-3xl font-black text-white mt-1">{students.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-400/30">
            <div className="text-xs text-rose-300 uppercase tracking-wider">Ban / Nofaol</div>
            <div className="font-display text-3xl font-black text-white mt-1">{students.filter(s => s.banned).length}</div>
          </div>
        </div>

        <div className="text-xs text-white/40 mb-3">Yangilanish: <span className="font-mono text-lime-300">tick #{tick}</span> · avtomatik har 0.5 sekundda</div>

        <div className="space-y-2">
          {active.map(({ student, activity }) => {
            const stage = activity ? stages.find(s => s.id === activity.stageId) : null;
            const isPlaying = activity?.status === "playing";
            const meta = stage ? GAME_MODE_META[stage.mode] : null;
            return (
              <div key={student.id} className={cn("p-3 rounded-lg border flex items-center gap-4 transition",
                isPlaying ? "bg-lime-500/10 border-lime-400/40" : "bg-white/[0.02] border-white/10")}>
                <div className={cn("w-2 h-2 rounded-full", isPlaying ? "bg-lime-400 pulse-ring" : "bg-white/20")}/>
                <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 grid place-items-center text-xs font-bold text-white shrink-0 border-2",
                  student.activeSkin === "neon_cyan" ? "border-cyan-400 glow-cyan" : "border-transparent")}>
                  {student.fio.split(" ").map((x: any) => x[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-semibold truncate", 
                    student.activeBorder === "golden_fire" ? "text-yellow-300 font-black animate-pulse" : "text-white")}>
                    {student.fio} {student.activeBorder === "golden_fire" && "🔥"}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {activity && stage && meta ? (
                      <>▶ <span className="text-white/80">{meta.icon} {meta.name}</span> — Bosqich #{stage.id}</>
                    ) : student.banned ? "🚫 BAN" : "⏸ Faol emas"}
                  </div>
                </div>
                {activity && (
                  <div className="w-32">
                    <div className="text-[10px] text-white/50 text-right mb-0.5">{Math.round(activity.progress)}%</div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className={cn("h-full transition-all", activity.status === "won" ? "bg-lime-400" : activity.status === "lost" ? "bg-rose-500" : "bg-cyan-400")} style={{ width: `${activity.progress}%` }}/>
                    </div>
                  </div>
                )}
                <div className="text-right w-24">
                  <div className="font-mono text-white font-bold">{student.totalScore || 0}/50</div>
                  <div className="text-[10px] text-white/50">{activity ? new Date(activity.startedAt).toLocaleTimeString() : "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function useMyData() {
  const teacher = useCurrentUser()!;
  const groups = useStore(s => s.groups).filter(g => g.teacherId === teacher.id);
  const users = useStore(s => s.users);
  const students = users.filter(u => u.role === "student" && groups.some(g => g.id === u.groupId));
  const tasks = useStore(s => s.tasks).filter(t => t.teacherId === teacher.id);
  const submissions = useStore(s => s.submissions).filter(s => tasks.some(t => t.id === s.taskId));
  return { teacher, groups, students, tasks, submissions };
}

function Overview({ setPage }: { setPage: (p: string) => void }) {
  const { teacher, groups, students, tasks, submissions } = useMyData();
  const pending = submissions.filter(s => s.status === "pending").length;
  const avg = students.length ? (students.reduce((s, u) => s + (u.totalScore || 0), 0) / students.length).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="TEACHER"
        title={`Salom, ${teacher.fio} 👋`}
        right={<Badge tone="amber">🎓 {(teacher.subjects || []).join(", ")}</Badge>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Guruhlarim" value={groups.length.toString()} tone="cyan" />
        <Stat label="Talabalar" value={students.length.toString()} tone="violet" />
        <Stat label="Tekshirilmagan" value={pending.toString()} delta="ish" tone="red" />
        <Stat label="Guruh o'rtachasi" value={`${avg}/50`} tone="lime" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="font-display text-xl font-bold text-white mb-4">Guruhlarim</div>
          {groups.length === 0 ? (
            <div className="text-white/50 text-sm">Guruhlar biriktirilmagan</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {groups.map(g => {
                const gs = students.filter(s => s.groupId === g.id);
                const avg = gs.length ? gs.reduce((s, u) => s + (u.totalScore || 0), 0) / gs.length : 0;
                return (
                  <div key={g.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="text-white font-semibold">{g.name}</div>
                    <div className="text-xs text-white/50">{gs.length} ta talaba · {g.course}-kurs</div>
                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-lime-400" style={{ width: `${(avg / 50) * 100}%` }} />
                    </div>
                    <div className="text-xs text-white/60 mt-1 font-mono">{avg.toFixed(1)}/50 o'rtacha</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="text-xs tracking-widest text-white/40 uppercase mb-3">Tezkor ishlar</div>
          <div className="space-y-2">
            <button onClick={() => setPage("tasks")} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/90">📝 Topshiriqlar</button>
            <button onClick={() => setPage("grading")} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/90">✅ Tekshirish navbati ({pending})</button>
            <button onClick={() => setPage("criteria")} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/90">⚖️ Baholash mezonlari</button>
            <button onClick={() => setPage("students")} className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/90">🏆 Talabalar reytingi</button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-3">So'nggi topshiriqlar</div>
        <div className="space-y-2">
          {tasks.slice(-5).reverse().map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div>
                <div className="text-white font-semibold">{t.title}</div>
                <div className="text-xs text-white/50">{t.subject} · deadline: {t.deadline}</div>
              </div>
              <Badge tone="cyan">{submissions.filter(s => s.taskId === t.id).length} topshirilgan</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Tasks() {
  const { teacher, groups, tasks } = useMyData();
  const createTask = useStore(s => s.createTask);
  const toast = useStore(s => s.toast);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<any>({
    subject: teacher.subjects?.[0] || "",
    title: "", description: "",
    deadline: new Date(Date.now() + 7*86400000).toISOString().slice(0,10),
    deadlineTime: "23:59",
    gameMode: "dark_maze" as GameMode,
    gamePayload: defaultPayload("dark_maze"),
    maxScore: 10, groupId: groups[0]?.id || "",
  });

  const pickMode = (m: GameMode) => setForm({ ...form, gameMode: m, gamePayload: defaultPayload(m) });

  const resetForm = () => {
    setStep(1);
    setForm({ ...form, title: "", description: "", gamePayload: defaultPayload(form.gameMode) });
  };

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="TEACHER" title="Mening topshiriqlarim" right={<Button onClick={() => setOpen(true)}>+ Yangi topshiriq</Button>} />
      <Card className="p-6">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-white/50">📝 Topshiriqlar yo'q</div>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => {
              const meta = t.gameMode ? GAME_MODE_META[t.gameMode] : null;
              return (
                <div key={t.id} className={cn("p-4 rounded-lg border flex items-start gap-4",
                  meta ? cn("bg-gradient-to-br", meta.color, "border-white/20") : "bg-white/[0.02] border-white/5")}>
                  {meta && <div className="text-4xl shrink-0">{meta.icon}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-white font-semibold">{t.title}</div>
                      {meta && <Badge tone="lime">{meta.name}</Badge>}
                    </div>
                    <div className="text-xs text-white/70">{t.subject} · {groups.find(g => g.id === t.groupId)?.name}</div>
                    <div className="text-xs text-white/60 mt-1">{t.description}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-white/50">Deadline</div>
                    <TaskCountdown deadline={t.deadline} time={t.deadlineTime} />
                    <div className="text-[10px] text-lime-300 mt-1 font-mono">Max: {t.maxScore} ball</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} size="xl">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div>
            <div className="font-display text-xl font-bold text-white">Yangi mustaqil ish · O'yin qobig'ida</div>
            <div className="text-xs text-white/50 mt-0.5">Mavzu → O'yin rejimi → Savollar</div>
          </div>
          <div className="flex gap-1 shrink-0">
            {[1,2,3].map(n => (
              <div key={n} className={cn("w-8 h-8 rounded-full grid place-items-center text-xs font-bold",
                step === n ? "bg-cyan-500 text-white" : step > n ? "bg-lime-500/40 text-lime-200" : "bg-white/10 text-white/40")}>
                {step > n ? "✓" : n}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Basic info */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="text-xs text-white/50 uppercase tracking-widest">Bosqich 1: Umumiy ma'lumot</div>
            <Select label="Fan Dunyosi (Subject Selection)" value={form.subjectId || ""} onChange={e => {
              const subjectsList = useStore.getState().subjects;
              const selected = subjectsList.find(sub => sub.id === e.target.value);
              setForm({ ...form, subjectId: e.target.value, subject: selected ? selected.name : "" });
            }}>
              <option value="">Fanni tanlang...</option>
              {useStore.getState().subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Sarlavha" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Masalan: Big-O notatsiyasi bo'yicha test" />
            <Textarea label="Tavsif" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Talabaga ko'rinadigan qisqacha izoh" />
            
            {/* GEYMIFIKATSIYA SOZLAMALARI PANELI (ADVANCED PARAMETERS) */}
            <div className="p-4 rounded-xl border border-cyan-400/20 bg-cyan-950/10 space-y-3">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">⚡ Geymifikatsiya va Anticheat Sozlamalari</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Select label="Jonlar soni (Attempts)" value={form.allowedAttempts || 3} onChange={e => setForm({ ...form, allowedAttempts: +e.target.value })}>
                  <option value={1}>1 ta ❤️</option>
                  <option value={2}>2 ta ❤️</option>
                  <option value={3}>3 ta ❤️</option>
                  <option value={4}>4 ta ❤️</option>
                  <option value={5}>5 ta ❤️</option>
                </Select>
                <Select label="Taymer Turi" value={form.timerMode || "global"} onChange={e => setForm({ ...form, timerMode: e.target.value })}>
                  <option value="global">Butun o'yin uchun</option>
                  <option value="per_question">Har bir savolga</option>
                  <option value="no_timer">Taymersiz</option>
                </Select>
                <Input label="Taymer (sekund)" type="number" value={form.timeLimitSeconds || 45} onChange={e => setForm({ ...form, timeLimitSeconds: +e.target.value })} />
                <Input label="Har xato penaltisi (ball)" type="number" step="0.1" value={form.penaltyRate || 0.5} onChange={e => setForm({ ...form, penaltyRate: +e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tc_ac" checked={form.antiCheatActive ?? true} onChange={e => setForm({ ...form, antiCheatActive: e.target.checked })} />
                  <label htmlFor="tc_ac" className="text-white/80 cursor-pointer">🛡️ Tab almashtirganda o'yinni tugatish (Anticheat)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tc_sh" checked={form.shuffleQuestions ?? false} onChange={e => setForm({ ...form, shuffleQuestions: e.target.checked })} />
                  <label htmlFor="tc_sh" className="text-white/80 cursor-pointer">🔀 Savollarni aralashtirish (Shuffle)</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input label="Deadline sana" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              <Input label="Deadline vaqt" type="time" value={form.deadlineTime} onChange={e => setForm({ ...form, deadlineTime: e.target.value })} />
              <Input label="Maks. ball" type="number" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: +e.target.value })} />
            </div>
            <Select label="Guruh" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            <Button tone="lime" className="w-full mt-2" onClick={() => {
              if (!form.title || !form.subject || !form.groupId) { toast({ title: "Barcha maydonlarni to'ldiring", tone: "error" }); return; }
              setStep(2);
            }}>Keyingi: O'yin rejimini tanlash →</Button>
          </div>
        )}

        {/* STEP 2: Pick game mode */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="text-xs text-white/50 uppercase tracking-widest">Bosqich 2: O'yin qobig'i (15 tadan biri)</div>
            <div className="grid grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {(Object.keys(GAME_MODE_META) as any[]).map(k => {
                const m = GAME_MODE_META[k as keyof typeof GAME_MODE_META];
                const active = form.gameMode === k;
                return (
                  <button key={k} onClick={() => pickMode(k)}
                    className={cn("p-3 rounded-lg border-2 text-left transition bg-gradient-to-br",
                      active ? cn(m.color, "border-white/60 ring-2 ring-cyan-400/50") : cn(m.color, "opacity-60 border-white/10 hover:opacity-100 hover:border-white/30"))}>
                    <div className="text-2xl">{m.icon}</div>
                    <div className="text-white font-semibold text-xs mt-1">{m.name}</div>
                    <div className="text-white/70 text-[10px] mt-0.5 leading-tight">{m.desc}</div>
                    <div className="text-amber-200 text-[10px] mt-1">{"★".repeat(m.difficulty)}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button tone="secondary" onClick={() => setStep(1)}>← Orqaga</Button>
              <Button tone="lime" className="flex-1" onClick={() => setStep(3)}>Keyingi: Savollarni kiritish →</Button>
            </div>
          </div>
        )}

        {/* STEP 3: Enter questions */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="text-xs text-white/50 uppercase tracking-widest">Bosqich 3: Savollarni kiriting</div>
            <div className="max-h-[500px] overflow-y-auto pr-1">
              <QuestionEditor mode={form.gameMode} payload={form.gamePayload}
                onChange={p => setForm({ ...form, gamePayload: p })} />
            </div>
            <div className="flex gap-2">
              <Button tone="secondary" onClick={() => setStep(2)}>← Orqaga</Button>
              <Button tone="lime" className="flex-1" onClick={() => {
                if (!form.subjectId) { toast({ title: "Fanni tanlash shart", tone: "error" }); return; }
                createTask({
                  subjectId: form.subjectId,
                  subject: form.subject,
                  title: form.title,
                  description: form.description,
                  deadline: form.deadline,
                  deadlineTime: form.deadlineTime,
                  gameMode: form.gameMode,
                  gamePayload: form.gamePayload,
                  maxScore: form.maxScore,
                  groupId: form.groupId,
                  teacherId: teacher.id,
                  // Advanced parameters:
                  allowedAttempts: form.allowedAttempts || 3,
                  timerMode: form.timerMode || "global",
                  timeLimitSeconds: form.timeLimitSeconds || 45,
                  speedBonusMultiplier: form.speedBonusMultiplier || 1.2,
                  penaltyRate: form.penaltyRate || 0.5,
                  antiCheatActive: form.antiCheatActive ?? true,
                  shuffleQuestions: form.shuffleQuestions ?? false
                });
                toast({ title: "✓ Topshiriq e'lon qilindi!", desc: `${form.title} · ${GAME_MODE_META[form.gameMode as GameMode].name}`, tone: "success" });
                setOpen(false);
                resetForm();
              }}>💾 E'lon qilish</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Grading() {
  const { submissions, tasks } = useMyData();
  const users = useStore(s => s.users);
  const [selected, setSelected] = useState<Submission | null>(null);

  const sorted = [...submissions].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return b.submittedAt - a.submittedAt;
  });

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="TEACHER" title="Tekshirish navbati" right={<Badge tone="red">{submissions.filter(s => s.status === "pending").length} ta kutmoqda</Badge>} />
      <Card className="p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
              <th className="py-2">Talaba</th><th>Topshiriq</th><th>Sana</th><th>Original.</th><th>Ball</th><th>Holat</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(sub => {
              const t = tasks.find(x => x.id === sub.taskId);
              const st = users.find(u => u.id === sub.studentId);
              return (
                <tr key={sub.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="py-3 text-white">{st?.fio}</td>
                  <td className="text-white/80">
                    <div className="font-medium">{t?.title}</div>
                    <div className="text-xs text-white/50">{t?.subject}</div>
                  </td>
                  <td className="text-white/50 font-mono text-xs">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`font-mono ${sub.originality >= 80 ? "text-lime-300" : sub.originality >= 50 ? "text-amber-300" : "text-rose-400"}`}>
                      {sub.originality}%
                    </span>
                  </td>
                  <td className="font-display font-bold text-white">{sub.earnedScore}/{t?.maxScore}</td>
                  <td>
                    {sub.status === "pending"  && <Badge tone="cyan">Kutilmoqda</Badge>}
                    {sub.status === "checked"  && <Badge tone="lime">✓</Badge>}
                    {sub.status === "late"     && <Badge tone="amber">Kechikkan</Badge>}
                    {sub.status === "resubmit" && <Badge tone="red">Qayta</Badge>}
                  </td>
                  <td className="text-right">
                    <Button size="sm" onClick={() => setSelected(sub)}>Baholash</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="text-center py-12 text-white/50">✨ Barcha ishlar tekshirilgan</div>}
      </Card>

      {selected && <GradeModal sub={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function GradeModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const task = useStore(s => s.tasks.find(t => t.id === sub.taskId));
  const student = useStore(s => s.users.find(u => u.id === sub.studentId));
  const grade = useStore(s => s.gradeSubmission);
  const toast = useStore(s => s.toast);
  const [mark, setMark] = useState(sub.teacherMark || 3);
  const [comment, setComment] = useState(sub.comment || "");

  return (
    <Modal open onClose={onClose} size="lg">
      <div className="font-display text-xl font-bold text-white mb-1">{task?.title}</div>
      <div className="text-white/50 text-sm mb-4">{student?.fio} · {task?.subject}</div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniInfo label="Original. (Beta)" val={`${sub.originality}%`} tone={sub.originality >= 80 ? "lime" : sub.originality >= 50 ? "amber" : "red"} />
        <MiniInfo label="Deadline" val={task?.deadline || ""} />
        <MiniInfo label="Topshirdi" val={new Date(sub.submittedAt).toLocaleDateString()} />
      </div>

      <div className="p-4 rounded-lg bg-black/40 border border-white/10 max-h-40 overflow-y-auto text-sm text-white/80 mb-4">
        <div className="text-xs text-white/40 uppercase mb-2">Talaba topshiruvi</div>
        {sub.content || "(bo'sh)"}
      </div>

      <div className="mb-4">
        <div className="text-[10px] tracking-widest text-white/40 uppercase mb-2">O'qituvchi bahosi (1-5)</div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setMark(n)}
              className={`flex-1 h-12 rounded-lg font-display font-black text-xl transition ${mark === n ? "bg-gradient-to-br from-amber-400 to-orange-600 text-black shadow-lg" : "bg-white/5 hover:bg-white/10 text-white/40"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <Textarea label="Kommentariy (talabaga ko'rinadi)" rows={3} value={comment} onChange={e => setComment(e.target.value)} />

      <Button tone="lime" className="w-full mt-4" onClick={() => {
        grade(sub.id, mark, comment);
        toast({ title: "Baholandi", desc: `${student?.fio} — ${mark}/5`, tone: "success" });
        onClose();
      }}>💾 Saqlash va yakuniy ball hisoblash</Button>
    </Modal>
  );
}

function MiniInfo({ label, val, tone }: { label: string; val: string; tone?: "lime" | "amber" | "red" }) {
  const t: Record<string, string> = { lime: "text-lime-300", amber: "text-amber-300", red: "text-rose-400" };
  return (
    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
      <div className="text-[10px] text-white/50 uppercase tracking-wider">{label}</div>
      <div className={`font-mono font-bold mt-0.5 ${tone ? t[tone] : "text-white"}`}>{val}</div>
    </div>
  );
}

function Criteria() {
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="TEACHER · ALGORITM" title="Baholash mezonlari" right={<Badge tone="cyan">Har topshiriq = 10 ball</Badge>} />

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-4">1. Muddat (Deadline)</div>
        <div className="grid md:grid-cols-3 gap-3">
          <MetricBox title="Vaqtida" val="+2 ball" tone="lime" note="Deadline ichida topshirsa avtomatik +2" />
          <MetricBox title="Har kun kechikish" val="−0.5 ball" tone="amber" note="Formula: -0.5 * daysLate" />
          <MetricBox title="7+ kun" val="0 ball" tone="red" note="Haddan tashqari kechikish" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>2. Plagiat darajasi (Originality)</span>
          <Badge tone="cyan">Beta (Jaccard Index)</Badge>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <MetricBox title="80% dan yuqori" val="TO'LIQ ball" tone="lime" note="AI plagiat checker orqali avtomatik" />
          <MetricBox title="50% – 80%" val="YARIM ball" tone="amber" note="Ball × 0.5" />
          <MetricBox title="50% dan past" val="0 ball · RESUBMIT" tone="red" note="Avtomatik qayta topshirishga yo'naltiriladi" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-4">3. Yakuniy Formula</div>
        <div className="p-5 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-cyan-200 overflow-x-auto whitespace-pre">
{`final_score = ((teacher_mark × 1.2) + deadline_bonus) × originality_factor

// shield_multiplier: agar talabada Sug'urta (Shield) bo'lsa va mag'lub bo'lsa:
if (has_shield_and_lost) final_score = max_score * 0.5; // 50% ball avtomatik asraladi`}
        </div>
      </Card>

      <Card className="p-6 border-l-4 border-teal-400">
        <div className="font-display text-lg font-bold text-teal-300 mb-2">5. Antikorrupsiya va Shaffoflik Kodeksi (Anti-Bribery Protocol)</div>
        <div className="text-white/80 text-sm space-y-3">
          <p>
            Bizning platformada talabalar pul to'lab **bahoni yoki ballarni** sotib ololmaydilar. 
            Do'kondagi barcha xaridlar faqatgina o'yin mexanikalaridagi yordamchi vositalardir (masalan, qo'shimcha jon ❤️, vaqt muzlatish ⏳, yoki reyting uchun kosmetik hoshiyalar 🎨).
          </p>
          <div className="grid md:grid-cols-2 gap-3 text-xs mt-3">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-teal-300 font-bold mb-1">🔐 O'qituvchi Mustaqilligi</div>
              Talabaning do'konda sarflagan pullari bevosita o'qituvchiga daxldor emas va o'qituvchi buni ko'rmaydi. Bu o'qituvchi tomonidan o'yinlarni ataylab murakkablashtirish xavfini yo'q qiladi.
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-teal-300 font-bold mb-1">💡 Teng Imkoniyat</div>
              O'yinni mukammal darajada yechgan talaba biror marta ham pul sarflamay eng yuqori 50 ballik natijaga erisha oladi. Pullik xizmat faqat xato qilgan talabaga vaqtni tejash uchun ikkinchi urinish beradi.
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="font-display text-lg font-bold text-white mb-4">4. SQL — semestr ballari</div>
        <pre className="p-5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-lime-200 overflow-x-auto">{`SELECT 
  st.student_id, 
  s.fio,
  SUM(st.earned_score) AS total_score,
  CASE 
    WHEN SUM(st.earned_score) >= 41 THEN 'green'
    WHEN SUM(st.earned_score) >= 26 THEN 'yellow'
    ELSE 'red'
  END AS zone
FROM student_tasks st
JOIN students s ON s.id = st.student_id
WHERE st.status = 'checked' 
  AND st.semester_id = @current_semester
GROUP BY st.student_id
ORDER BY total_score DESC;`}</pre>
      </Card>
    </div>
  );
}

function TaskCountdown({ deadline, time }: { deadline: string; time?: string }) {
  const [remain, setRemain] = useState("");
  useEffect(() => {
    const target = new Date(`${deadline}T${time || "23:59"}:00`).getTime();
    const upd = () => {
      const ms = target - Date.now();
      if (ms <= 0) { setRemain("⚠️ MUDDATI O'TDI"); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemain(d > 0 ? `${d}k ${h}s ${m}d` : `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    upd();
    const t = setInterval(upd, 1000);
    return () => clearInterval(t);
  }, [deadline, time]);
  const isOverdue = remain.includes("⚠️");
  return <div className={cn("font-mono font-bold text-sm", isOverdue ? "text-rose-400" : "text-white")}>{remain}</div>;
}

function MetricBox({ title, val, tone, note }: { title: string; val: string; tone: "lime" | "amber" | "red"; note: string }) {
  const map = { lime: "border-lime-400/30 text-lime-300", amber: "border-amber-400/30 text-amber-300", red: "border-rose-400/30 text-rose-300" };
  return (
    <div className={`p-4 rounded-xl border bg-white/[0.02] ${map[tone]}`}>
      <div className="text-white/70 text-xs">{title}</div>
      <div className="font-display font-black text-2xl mt-1">{val}</div>
      <div className="text-white/50 text-xs mt-2">{note}</div>
    </div>
  );
}

function StudentsRating() {
  const { teacher, students, groups } = useMyData();
  const sorted = [...students].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const createUser = useStore(s => s.createUser);
  const toast = useStore(s => s.toast);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fio: "", login: "", password_hash: "", groupId: groups[0]?.id || "" });

  const handleAddStudent = () => {
    if (!form.fio || !form.login || !form.password_hash || !form.groupId) {
      toast({ title: "Xato", desc: "Barcha maydonlarni to'ldiring!", tone: "error" });
      return;
    }
    const checkUser = useStore.getState().users.find(u => u.login === form.login);
    if (checkUser) {
      toast({ title: "Xato", desc: "Bu login band! Boshqa login kiriting.", tone: "error" });
      return;
    }

    createUser({
      role: "student",
      login: form.login,
      password_hash: form.password_hash,
      fio: form.fio,
      universityId: teacher.universityId,
      groupId: form.groupId,
      wallet: 20_000,
      totalScore: 0,
      bonusScore: 0,
      studentIdCode: "LUV-" + Math.floor(Math.random() * 9000 + 1000),
      teacherId: teacher.id,
      lives: 3,
      inventory: [],
      streak: 0,
      streakFreezes: 0,
      shields: 0,
      timeFreezes: 0
    });

    toast({ title: "✓ Talaba qo'shildi!", desc: `${form.fio} muvaffaqiyatli saqlandi.`, tone: "success" });
    setOpen(false);
    setForm({ fio: "", login: "", password_hash: "", groupId: groups[0]?.id || "" });
  };

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [banReason, setBanReason] = useState("");
  const submitBanReq = useStore(s => s.submitBanRequest);

  const handleBanRequestSubmit = () => {
    if (!banReason || !selectedStudent) return;
    submitBanReq(teacher.id, teacher.fio, selectedStudent.id, selectedStudent.fio, banReason);
    setBanModalOpen(false);
    setSelectedStudent(null);
    setBanReason("");
  };

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="TEACHER" title="Talabalar reytingi" right={
        <div className="flex gap-2">
          <Button tone="lime" size="sm" onClick={() => setOpen(true)}>+ Yangi Talaba Qo'shish</Button>
          <Badge tone="amber">Faqat mening talabalarim</Badge>
        </div>
      } />

      {/* TEACHER ADD STUDENT FORM MODAL (Yopiq Tizim Ro'yxatga Olish) */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-4">🆕 Yangi Talaba Qo'shish (Yopiq Tizim)</div>
        <div className="space-y-3">
          <Input label="Talabaning Ismi Familiyasi (F.I.Sh):" value={form.fio} onChange={e => setForm({ ...form, fio: e.target.value })} placeholder="Masalan: Nodirbek Yusupov" />
          <Input label="Tizim uchun Login (username):" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} placeholder="Masalan: nodir_dev" />
          <Input label="Boshlang'ich Parol:" value={form.password_hash} onChange={e => setForm({ ...form, password_hash: e.target.value })} placeholder="Masalan: student123" />
          <Select label="Guruh:" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
          <div className="flex gap-2 pt-3 border-t border-white/15">
            <Button tone="secondary" className="flex-1" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button tone="lime" className="flex-1" onClick={handleAddStudent}>Talabani Saqlash</Button>
          </div>
        </div>
      </Modal>

      {/* REQUEST BAN FROM OWNER MODAL */}
      <Modal open={banModalOpen} onClose={() => setBanModalOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-2">🚨 Ban Berishni So'rash (Owner'ga yuborish)</div>
        <p className="text-xs text-white/50 mb-4">Talaba: <span className="text-white font-bold">{selectedStudent?.fio}</span></p>
        <div className="space-y-3">
          <Textarea label="Ban berish sababi (Batafsil):" value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Masalan: PrintScreen kashf qildi, Tab focusing o'chirdi..." required />
          <div className="flex gap-2 pt-3 border-t border-white/15">
            <Button tone="secondary" className="flex-1" onClick={() => setBanModalOpen(false)}>Bekor</Button>
            <Button tone="danger" className="flex-1" disabled={!banReason} onClick={handleBanRequestSubmit}>🚨 So'rov Yuborish</Button>
          </div>
        </div>
      </Modal>

      <Card className="p-6">
        <div className="space-y-2">
          {sorted.map((s, i) => {
            const z = zoneOf(s.totalScore || 0);
            return (
              <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex-wrap md:flex-nowrap">
                <div className={`w-10 h-10 rounded-lg grid place-items-center font-display font-black ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-black" : i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-black" : i === 2 ? "bg-gradient-to-br from-orange-600 to-amber-800 text-white" : "bg-white/5 text-white/60"}`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div className="text-white font-semibold">{s.fio}</div>
                  <div className="text-xs text-white/50">{s.studentIdCode}</div>
                </div>
                <div className="w-40 shrink-0">
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${z === "green" ? "bg-lime-400" : z === "yellow" ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${((s.totalScore || 0) / 50) * 100}%` }} />
                  </div>
                </div>
                <div className="w-20 text-right shrink-0">
                  <div className="font-display font-black text-white">{s.totalScore}<span className="text-white/40 text-sm">/50</span></div>
                </div>
                <ZoneChip zone={z} />
                <div className="shrink-0 ml-auto md:ml-0">
                  {s.banned ? (
                    <Badge tone="red">BANlangan</Badge>
                  ) : (
                    <Button tone="danger" size="sm" onClick={() => {
                      setSelectedStudent(s);
                      setBanReason("");
                      setBanModalOpen(true);
                    }}>🚨 Ban so'rash</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function ExtensionRequestsView() {
  const requests = useStore(s => s.extensionRequests);
  const approveExt = useStore(s => s.approveExtensionRequest);
  const rejectExt = useStore(s => s.rejectExtensionRequest);

  const teacher = useCurrentUser()!;
  const myTasks = useStore(s => s.tasks).filter(t => t.teacherId === teacher.id);
  
  // Only show extension requests for tasks belonging to THIS teacher!
  const myRequests = requests.filter(r => myTasks.some(t => t.id === r.taskId) && r.status === "pending");

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle eyebrow="TEACHER · REQS" title="Topshiriq Muddatini Uzaytirish Arizalari" right={<Badge tone="cyan">{myRequests.length} ta pending</Badge>} />
      
      <Card className="p-6">
        {myRequests.length === 0 ? (
          <div className="text-center py-12 text-white/50 text-sm">
            ✨ Kutilayotgan muddat uzaytirish arizalari mavjud emas.
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map(r => (
              <div key={r.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">{r.id}</div>
                  <div className="text-white font-bold text-lg">{r.studentName} (Student)</div>
                  <div className="text-xs text-cyan-300 font-bold mt-0.5">Topshiriq: {r.taskTitle}</div>
                  <div className="text-xs text-white/70">So'ralayotgan muddat: <span className="text-lime-300 font-bold">+{r.requestedDays} kun</span></div>
                  <div className="text-xs text-rose-300">Sabab: {r.reason}</div>
                  <div className="text-[10px] text-white/50 mt-1.5">Sana: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button tone="lime" size="sm" onClick={() => approveExt(r.id)}>✅ Tasdiqlash</Button>
                  <Button tone="secondary" size="sm" onClick={() => rejectExt(r.id)}>✕ Rad etish</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
