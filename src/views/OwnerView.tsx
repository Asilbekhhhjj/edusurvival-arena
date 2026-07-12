import { useState } from "react";
import { Card, SectionTitle, Stat, Badge, Button, Input, Select, Modal, formatMoney, timeAgo, Textarea } from "../components/UI";
import { useStore } from "../store";
import { cn } from "../utils/cn";

export function OwnerView({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  if (page === "unis")    return <Universities />;
  if (page === "users")   return <Users />;
  if (page === "revenue") return <Revenue />;
  if (page === "ads")     return <Ads />;
  if (page === "bans")    return <Bans />;
  if (page === "logs")    return <Logs />;
  if (page === "backend") return <BackendDevView />;
  if (page === "requests") return <RegistrationRequestsView />;
  if (page === "ban_requests") return <BanRequestsView />;
  if (page === "assign_subjects") return <AssignSubjectsView />;
  if (page === "subjects_crud") return <SubjectsCrudView />;
  return <Overview setPage={setPage} />;
}

function Overview({ setPage }: { setPage: (p: string) => void }) {
  const universities = useStore(s => s.universities);
  const users = useStore(s => s.users);
  const logs = useStore(s => s.logs);

  const students = users.filter(u => u.role === "student");
  const teachers = users.filter(u => u.role === "teacher");
  const banned = users.filter(u => u.banned);

  const revenue = 184_500_000 + 121_200_000 + 74_800_000;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="OWNER · GLOBAL CONTROL"
        title="Butun tizim ustidan nazorat"
        right={<Badge tone="violet">👑 Sohib huquqi</Badge>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Faol universitetlar" value={`${universities.filter(u => u.active).length}/${universities.length}`} delta="+2 oy" tone="violet" />
        <Stat label="Umumiy talabalar" value={students.length.toString()} delta={`+${teachers.length} o'qituvchi`} tone="cyan" />
        <Stat label="Semestr daromadi" value={`${(revenue / 1_000_000).toFixed(1)} mln`} delta="so'm · +34%" tone="lime" />
        <Stat label="Ban qilinganlar" value={banned.length.toString()} delta="ushbu oy" tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs tracking-widest text-white/40 uppercase">Daromad dinamikasi</div>
              <div className="font-display text-xl font-bold text-white">7 oylik grafigi</div>
            </div>
            <Badge tone="lime">↑ 486% YoY</Badge>
          </div>
          <div className="h-56 flex items-end gap-3">
            {[{ m: "Sen", v: 12 }, { m: "Okt", v: 18 }, { m: "Noy", v: 24 }, { m: "Dek", v: 31 }, { m: "Yan", v: 44 }, { m: "Fev", v: 58 }, { m: "Mar", v: 72 }].map(r => (
              <div key={r.m} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative rounded-t-md bg-gradient-to-t from-violet-600 via-cyan-500 to-lime-400" style={{ height: `${r.v * 2.5}px` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white/60 font-mono">{r.v}m</div>
                </div>
                <div className="text-[10px] text-white/50">{r.m}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs tracking-widest text-white/40 uppercase">Real vaqt loglari</div>
            <button onClick={() => setPage("logs")} className="text-xs text-cyan-300">Barchasi →</button>
          </div>
          <ul className="space-y-2 text-sm">
            {logs.slice(0, 6).map(l => (
              <li key={l.id} className="flex items-start gap-2">
                <Badge tone={l.level === "BAN" ? "red" : l.level === "PAY" ? "lime" : l.level === "WARN" ? "amber" : "cyan"}>{l.level}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-white/85 text-xs truncate">{l.message}</div>
                  <div className="text-[10px] text-white/40">{timeAgo(l.ts)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl font-bold text-white">Universitetlar reytingi</div>
          <Button size="sm" onClick={() => setPage("unis")}>Boshqarish →</Button>
        </div>
        <UniTable />
      </Card>
    </div>
  );
}

function UniTable() {
  const universities = useStore(s => s.universities);
  const users = useStore(s => s.users);
  const toggle = useStore(s => s.toggleUniversity);
  const toast = useStore(s => s.toast);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
            <th className="py-2 pr-4">Universitet</th>
            <th className="py-2 pr-4">Shahar</th>
            <th className="py-2 pr-4">Talabalar</th>
            <th className="py-2 pr-4">O'qituvchi</th>
            <th className="py-2 pr-4">Holat</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {universities.map(u => {
            const st = users.filter(x => x.universityId === u.id && x.role === "student").length;
            const te = users.filter(x => x.universityId === u.id && x.role === "teacher").length;
            return (
              <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-gradient-to-br from-cyan-500/40 to-violet-500/40 grid place-items-center font-display font-black text-white text-xs">{u.short}</div>
                    <div className="text-white font-medium">{u.name}</div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-white/70">{u.city}</td>
                <td className="py-3 pr-4 font-mono text-white">{st}</td>
                <td className="py-3 pr-4 font-mono text-white/80">{te}</td>
                <td className="py-3 pr-4">
                  {u.active ? <Badge tone="lime">FAOL</Badge> : <Badge tone="gray">PAUZA</Badge>}
                </td>
                <td className="py-3 pr-4 text-right">
                  <Button size="sm" tone="secondary" onClick={() => { toggle(u.id); toast({ title: `${u.short} holati o'zgartirildi`, tone: "info" }); }}>
                    {u.active ? "Pauza qilish" : "Faollashtirish"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Universities() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", short: "", city: "" });
  const createUniversity = useStore(s => s.createUniversity);
  const toast = useStore(s => s.toast);

  const submit = () => {
    if (!form.name || !form.short || !form.city) {
      toast({ title: "Barcha maydonlarni to'ldiring", tone: "error" });
      return;
    }
    createUniversity({ ...form, active: true });
    toast({ title: "Yangi universitet qo'shildi", desc: form.short, tone: "success" });
    setOpen(false);
    setForm({ name: "", short: "", city: "" });
  };

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="OWNER" title="Universitetlar" right={<Button onClick={() => setOpen(true)}>+ Yangi universitet</Button>} />
      <Card className="p-6"><UniTable /></Card>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-4">Yangi universitet</div>
        <div className="space-y-3">
          <Input label="To'liq nomi" placeholder="masalan: Toshkent Davlat Universiteti" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Qisqartma" placeholder="TDU" value={form.short} onChange={e => setForm({ ...form, short: e.target.value })} />
          <Input label="Shahar" placeholder="Toshkent" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          <Button tone="lime" className="w-full" onClick={submit}>Yaratish</Button>
        </div>
      </Modal>
    </div>
  );
}

function Users() {
  const users = useStore(s => s.users);
  const universities = useStore(s => s.universities);
  const groups = useStore(s => s.groups);
  const createUser = useStore(s => s.createUser);
  const resetPassword = useStore(s => s.resetPassword);
  const toast = useStore(s => s.toast);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");

  const [form, setForm] = useState<any>({
    login: "", password_hash: "", fio: "", role: "student" as "student"|"teacher", universityId: "tuit", groupId: "g1",
  });

  const filtered = filter === "all" ? users : users.filter(u => u.role === filter);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="OWNER · USERS"
        title="Foydalanuvchilar boshqaruvi"
        right={<Button onClick={() => setOpen(true)}>+ Yangi foydalanuvchi</Button>}
      />

      <Card className="p-6">
        <div className="flex gap-2 mb-4 flex-wrap">
          {["all", "owner", "teacher", "student"].map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${filter === r ? "bg-white/10 text-white border-white/25" : "border-white/10 text-white/60 hover:text-white"}`}>
              {r.toUpperCase()} ({r === "all" ? users.length : users.filter(u => u.role === r).length})
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">F.I.Sh</th><th>Login</th><th>Rol</th><th>Universitet</th><th>Holat</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {u.role === "student" && (
                        <div className={cn("w-6 h-6 rounded-full bg-white/10 grid place-items-center text-[10px] font-bold text-white shrink-0 border",
                          u.activeSkin === "neon_cyan" ? "border-cyan-400 glow-cyan" : "border-transparent")}>
                          {u.fio.split(" ").map((x: any) => x[0]).join("")}
                        </div>
                      )}
                      <span className={cn("font-medium", u.activeBorder === "golden_fire" ? "text-yellow-300 font-black animate-pulse" : "text-white")}>
                        {u.fio} {u.activeBorder === "golden_fire" && "🔥"}
                      </span>
                    </div>
                  </td>
                  <td className="text-white/70 font-mono text-xs">@{u.login}</td>
                  <td><Badge tone={u.role === "owner" ? "violet" : u.role === "teacher" ? "amber" : "lime"}>{u.role.toUpperCase()}</Badge></td>
                  <td className="text-white/70">{universities.find(x => x.id === u.universityId)?.short || "—"}</td>
                  <td>{u.banned ? <Badge tone="red">BAN</Badge> : <Badge tone="lime">FAOL</Badge>}</td>
                  <td className="text-right">
                    <button className="text-xs text-cyan-300 mr-3" onClick={() => { setResetFor(u.id); setNewPass(""); }}>🔑 Parol tiklash</button>
                    {u.role !== "owner" && (
                      <button className="text-xs text-rose-400 hover:text-rose-200" onClick={() => {
                        if (confirm(`${u.fio} ni tizimdan butunlay o'chirishga ruxsat berasizmi?`)) {
                          useStore.getState().deleteUser(u.id);
                          toast({ title: "Foydalanuvchi o'chirildi", tone: "info" });
                        }
                      }}>🗑 O'chirish</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-4">Yangi foydalanuvchi</div>
        <div className="space-y-3">
          <Input label="F.I.Sh" value={form.fio} onChange={e => setForm({ ...form, fio: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Login" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} />
            <Input label="Parol" value={form.password_hash} onChange={e => setForm({ ...form, password_hash: e.target.value })} />
          </div>
          <Select label="Rol" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </Select>
          <Select label="Universitet" value={form.universityId} onChange={e => setForm({ ...form, universityId: e.target.value })}>
            {universities.map(u => <option key={u.id} value={u.id}>{u.short}</option>)}
          </Select>
          {form.role === "student" && (
            <Select label="Guruh" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          )}
          <Button tone="lime" className="w-full" onClick={() => {
            if (!form.login || !form.password_hash || !form.fio) { toast({ title: "Barcha maydonlar shart", tone: "error" }); return; }
            createUser({ ...form, wallet: form.role === "student" ? 20_000 : undefined, totalScore: form.role === "student" ? 0 : undefined, bonusScore: 0 });
            toast({ title: "Foydalanuvchi yaratildi", desc: form.login, tone: "success" });
            setOpen(false);
            setForm({ login: "", password_hash: "", fio: "", role: "student", universityId: "tuit", groupId: "g1" });
          }}>Yaratish</Button>
        </div>
      </Modal>

      <Modal open={!!resetFor} onClose={() => setResetFor(null)} size="sm">
        <div className="font-display text-lg font-bold text-white mb-3">Parolni tiklash</div>
        <Input label="Yangi parol" value={newPass} onChange={e => setNewPass(e.target.value)} />
        <Button tone="lime" className="w-full mt-3" onClick={() => {
          if (!newPass) return;
          resetPassword(resetFor!, newPass);
          toast({ title: "Parol yangilandi", tone: "success" });
          setResetFor(null);
        }}>Saqlash</Button>
      </Modal>
    </div>
  );
}

function Revenue() {
  const shopItems = useStore(s => s.shopItems);
  const transactions = useStore(s => s.transactions);
  const approveTx = useStore(s => s.approveTransaction);
  const rejectTx = useStore(s => s.rejectTransaction);

  const pendingTxs = transactions.filter(t => t.status === "pending");
  const completedTxs = transactions.filter(t => t.status === "completed");
  const totalRev = completedTxs.reduce((sum, t) => sum + t.amountPaid, 0);

  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="OWNER · P2P KASSA" title="Manual Kassa & Do'kon" />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Tasdiqlash kutilmoqda" value={pendingTxs.length.toString()} delta="ta bilet" tone="cyan" />
        <Stat label="Tasdiqlangan xaridlar" value={completedTxs.length.toString()} delta="ta" tone="lime" />
        <Stat label="Umumiy tushum" value={formatMoney(totalRev).replace(" so'm", "")} delta="so'm" tone="violet" />
        <Stat label="Aktiv mahsulotlar" value={shopItems.length.toString()} tone="red" />
      </div>

      {/* P2P PENDING APPROVALS LIST */}
      <Card className="p-6 border-l-4 border-amber-400">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-white text-lg">⏳ Kelgan To'lov Cheklari (Pending Receipts)</h3>
            <p className="text-white/60 text-xs mt-0.5">Asilbek, telefoningizdagi bank ilovangiz (Humo/Uzcard) orqali pul tushganini tekshirib, keyin tasdiqlang.</p>
          </div>
          <Badge tone="amber">{pendingTxs.length} ta yangi</Badge>
        </div>

        {pendingTxs.length === 0 ? (
          <div className="text-center py-8 text-white/45 text-sm">
            ✨ Hozircha kutilayotgan P2P kvitansiyalar mavjud emas.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTxs.map(t => (
              <div key={t.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">{t.id}</div>
                  <div className="text-white font-semibold">{t.studentName}</div>
                  <div className="text-xs text-white/70 mt-0.5">Sotib olmoqchi: <span className="text-cyan-300 font-bold">{t.itemPurchased}</span></div>
                  <div className="text-xs text-white/60">Karta egasi: <span className="text-white font-mono">{t.userCardName || "—"}</span></div>
                  <div className="text-xs text-white/50">Sana: {new Date(t.createdAt).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-display font-black text-lime-300 text-lg">{formatMoney(t.amountPaid)}</div>
                    {t.receiptImage && (
                      <button onClick={() => setSelectedReceipt(t.receiptImage)} className="text-xs text-cyan-300 hover:underline mt-1">
                        🖼️ Chekni ko'rish
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button tone="lime" size="sm" onClick={() => approveTx(t.id)}>✓ Tasdiqlash</Button>
                    <Button tone="danger" size="sm" onClick={() => {
                      if (confirm("Ushbu to'lovni rad etasizmi?")) rejectTx(t.id);
                    }}>✕ Rad etish</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* COMPLETED TRANSACTIONS HISTORY */}
        <Card className="p-6">
          <h3 className="font-display font-bold text-white text-lg mb-3">🧾 Tasdiqlangan Kvitansiyalar (Kassa Arxiv)</h3>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {completedTxs.map(t => (
              <div key={t.id} className="p-3 rounded-lg bg-white/[0.01] border border-white/5 flex justify-between items-center text-sm">
                <div>
                  <div className="text-white font-semibold">{t.studentName}</div>
                  <div className="text-xs text-white/50">{t.itemPurchased} · {new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-lime-300 font-mono font-bold">{formatMoney(t.amountPaid)}</div>
                  <Badge tone="lime">Completed</Badge>
                </div>
              </div>
            ))}
            {completedTxs.length === 0 && <div className="text-white/40 text-center py-6">Kassa tarixi bo'sh.</div>}
          </div>
        </Card>

        {/* SHOP ITEMS DEFINITION */}
        <Card className="p-6">
          <div className="font-display text-lg font-bold text-white mb-4">Do'kon mahsulotlari</div>
          <div className="grid gap-3">
            {shopItems.map(x => (
              <div key={x.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{x.icon}</div>
                  <div>
                    <div className="text-white font-semibold text-xs md:text-sm">{x.name}</div>
                    <div className="text-[11px] text-white/50 leading-tight">{x.desc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lime-300 whitespace-nowrap text-xs md:text-sm">{formatMoney(x.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RECEIPT IMAGE MODAL VIEWER */}
      <Modal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} size="md">
        <div className="font-display font-bold text-white mb-3">To'lov cheki skrinshoti</div>
        <div className="rounded-xl overflow-hidden bg-black/50 border border-white/10 max-h-[70vh] flex items-center justify-center">
          <img src={selectedReceipt || ""} alt="Receipt Snapshot" className="max-w-full h-auto object-contain" />
        </div>
      </Modal>
    </div>
  );
}

function Ads() {
  const ads = useStore(s => s.ads);
  const removeAd = useStore(s => s.removeAd);
  const createAd = useStore(s => s.createAd);
  const currentUserId = useStore(s => s.currentUserId);
  const toast = useStore(s => s.toast);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", color: "from-cyan-500 to-blue-600" });

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="OWNER" title="Reklama boshqaruvi (global)" right={<Button onClick={() => setOpen(true)}>+ Yangi reklama</Button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        {ads.map(a => (
          <Card key={a.id} className="p-5 overflow-hidden">
            <div className={`h-32 rounded-lg bg-gradient-to-br ${a.color} mb-4 grid place-items-center font-display font-black text-white text-xl scanline relative p-4 text-center`}>{a.title}</div>
            <div className="text-white/70 text-xs mb-3">{a.description}</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="text-white/50">Impressions</div><div className="font-mono text-white font-bold">{a.impressions.toLocaleString()}</div></div>
              <div><div className="text-white/50">Clicks</div><div className="font-mono text-cyan-300 font-bold">{a.clicks.toLocaleString()}</div></div>
              <div><div className="text-white/50">CTR</div><div className="font-mono text-lime-300 font-bold">{a.impressions ? ((a.clicks/a.impressions)*100).toFixed(1) : "0"}%</div></div>
            </div>
            <Button tone="danger" size="sm" className="w-full mt-3" onClick={() => { removeAd(a.id); toast({ title: "Reklama o'chirildi", tone: "info" }); }}>🗑 O'chirish</Button>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-4">Yangi global reklama</div>
        <div className="space-y-3">
          <Input label="Sarlavha" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input label="Tavsif" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <Select label="Ranglar" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}>
            <option value="from-cyan-500 to-blue-600">Cyan → Blue</option>
            <option value="from-lime-500 to-emerald-600">Lime → Emerald</option>
            <option value="from-violet-500 to-fuchsia-600">Violet → Fuchsia</option>
            <option value="from-red-500 to-orange-500">Red → Orange</option>
          </Select>
          <Button tone="lime" className="w-full" onClick={() => {
            if (!form.title) return;
            createAd({ ...form, active: true, createdBy: currentUserId! });
            toast({ title: "Reklama yaratildi", tone: "success" });
            setOpen(false);
            setForm({ title: "", description: "", color: "from-cyan-500 to-blue-600" });
          }}>Yaratish</Button>
        </div>
      </Modal>
    </div>
  );
}

function Bans() {
  const users = useStore(s => s.users);
  const unbanUser = useStore(s => s.unbanUser);
  const toast = useStore(s => s.toast);
  const banned = users.filter(u => u.banned);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="OWNER" title="Qora ro'yxat — Ban tizimi" right={<Badge tone="red">⛔ {banned.length} ta faol ban</Badge>} />
      <Card className="p-6">
        {banned.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            <div className="text-5xl mb-3">✨</div>
            <div>Ban qilingan foydalanuvchi yo'q</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">F.I.Sh</th><th>Login</th><th>Rol</th><th>Sabab</th><th></th>
              </tr>
            </thead>
            <tbody>
              {banned.map(u => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="py-3 text-white">{u.fio}</td>
                  <td className="text-white/70 font-mono">@{u.login}</td>
                  <td><Badge tone="gray">{u.role}</Badge></td>
                  <td className="text-rose-300">{u.banReason || "—"}</td>
                  <td className="text-right">
                    <Button size="sm" tone="lime" onClick={() => { unbanUser(u.id); toast({ title: "Ban ochildi", desc: u.fio, tone: "success" }); }}>🔓 Ochish (250K)</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Logs() {
  const logs = useStore(s => s.logs);
  const colors: Record<string, string> = { INFO: "text-cyan-300", WARN: "text-amber-300", BAN: "text-rose-400", ERROR: "text-rose-400", PAY: "text-lime-300" };
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="OWNER" title="Tizim loglari (real-time)" right={<Badge tone="cyan">{logs.length} ta yozuv</Badge>} />
      <Card className="p-6 font-mono text-xs">
        <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
          {logs.map(l => (
            <div key={l.id} className="flex gap-3">
              <span className="text-white/40 whitespace-nowrap">{new Date(l.ts).toLocaleTimeString()}</span>
              <span className={`${colors[l.level]} font-bold w-14`}>[{l.level}]</span>
              <span className="text-white/80 break-all">{l.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function BackendDevView() {
  const [activeTab, setActiveTab] = useState<"sql" | "db" | "teacher" | "student_map">("sql");
  const toast = useStore(s => s.toast);

  const sqlCode = `-- MySQL Database Schema for LUVIONX Game-Map Engine
CREATE DATABASE IF NOT EXISTS luvionx_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE luvionx_db;

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'teacher', 'student') NOT NULL,
  group_id VARCHAR(36) NULL,
  wallet DECIMAL(10,2) DEFAULT 0.00,
  total_score INT DEFAULT 0,
  streak INT DEFAULT 0,
  lives INT DEFAULT 3,
  active_skin VARCHAR(50) DEFAULT 'default',
  active_border VARCHAR(50) DEFAULT 'default',
  banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE game_tasks (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  game_type VARCHAR(50) NOT NULL,
  allowed_attempts INT DEFAULT 3,
  timer_mode ENUM('global', 'per_question', 'no_timer') DEFAULT 'global',
  time_limit_seconds INT DEFAULT 45,
  speed_bonus_multiplier DECIMAL(3,2) DEFAULT 1.20,
  penalty_rate DECIMAL(3,2) DEFAULT 0.50,
  anti_cheat_active BOOLEAN DEFAULT TRUE,
  prerequisite_task_id VARCHAR(36) NULL,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  deadline DATE NOT NULL,
  deadline_time TIME NOT NULL,
  max_score INT DEFAULT 10,
  game_payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_task_id) REFERENCES game_tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE student_progress (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(36) NOT NULL,
  remaining_lives INT NOT NULL,
  status ENUM('locked', 'active', 'completed', 'failed') DEFAULT 'locked',
  earned_coins INT DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES game_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventory (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  item_type ENUM('extra_life', 'shield', 'time_freeze', 'streak_freeze', 'cosmetic_skin', 'cosmetic_border') NOT NULL,
  quantity INT DEFAULT 1,
  item_code VARCHAR(50) NOT NULL,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  item_purchased VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;`;

  const phpDb = `<?php
// db.php - Database Connection Singleton (PHP PDO)
class Database {
    private static $instance = null;
    private $conn;

    private $host = 'localhost';
    private $user = 'root';
    private $pass = 'password_hash_here';
    private $name = 'luvionx_db';

    private function __construct() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->name};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $this->conn = new PDO($dsn, $this->user, $this->pass, $options);
        } catch (PDOException $e) {
            die("Database Connection Failed: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (!self::$instance) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}
?>`;

  const phpTeacher = `<?php
// TeacherController.php - Task Assignment and Question Configuration Controller (PHP PDO)
require_once 'db.php';

class TeacherController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function createGameTask($data) {
        $sql = "INSERT INTO game_tasks (
                    id, teacher_id, title, description, game_type, 
                    allowed_attempts, timer_mode, time_limit_seconds, 
                    speed_bonus_multiplier, penalty_rate, anti_cheat_active, 
                    shuffle_questions, deadline, deadline_time, max_score, game_payload
                ) VALUES (
                    :id, :teacher_id, :title, :description, :game_type, 
                    :allowed_attempts, :timer_mode, :time_limit_seconds, 
                    :speed_bonus_multiplier, :penalty_rate, :anti_cheat_active, 
                    :shuffle_questions, :deadline, :deadline_time, :max_score, :game_payload
                )";
        
        $stmt = $this->db->prepare($sql);
        
        $uuid = $this->generateUUID();
        $payloadJson = json_encode($data['game_payload']);
        
        $stmt->execute([
            ':id' => $uuid,
            ':teacher_id' => $data['teacher_id'],
            ':title' => $data['title'],
            ':description' => $data['description'],
            ':game_type' => $data['game_type'],
            ':allowed_attempts' => $data['allowed_attempts'] ?? 3,
            ':timer_mode' => $data['timer_mode'] ?? 'global',
            ':time_limit_seconds' => $data['time_limit_seconds'] ?? 45,
            ':speed_bonus_multiplier' => $data['speed_bonus_multiplier'] ?? 1.20,
            ':penalty_rate' => $data['penalty_rate'] ?? 0.50,
            ':anti_cheat_active' => $data['anti_cheat_active'] ?? true,
            ':shuffle_questions' => $data['shuffle_questions'] ?? false,
            ':deadline' => $data['deadline'],
            ':deadline_time' => $data['deadline_time'] ?? '23:59:00',
            ':max_score' => $data['max_score'] ?? 10,
            ':game_payload' => $payloadJson
        ]);
        
        return $uuid;
    }

    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
?>`;

  const phpStudentMap = `<?php
// student_map.php - Interactive Visual Map & Frontend JavaScript Engine
declare(strict_types=1);
require_once 'db.php';

// Validate login and student role
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'student') {
    header("HTTP/1.1 403 Forbidden");
    die("Access Denied");
}

$student_id = $_SESSION['user_id'];
$db = Database::getInstance()->getConnection();

// Fetch tasks and cross-reference with progress to enforce lock system
$stmt = $db->prepare("
    SELECT t.*, p.status, p.remaining_lives, p.earned_coins 
    FROM game_tasks t 
    LEFT JOIN student_progress p ON p.task_id = t.id AND p.student_id = :student_id
    ORDER BY t.created_at ASC
");
$stmt->execute([':student_id' => $student_id]);
$tasks = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="uz" class="bg-[#05060d] text-white">
<head>
    <meta charset="UTF-8">
    <title>LUVIONX Game-Map Engine</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-6">
    <div class="max-w-6xl mx-auto space-y-6">
        <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400 tracking-wider">
            LUVIONX INTERAKTIV HARITA
        </h1>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 relative">
            <?php foreach ($tasks as $i => $t): 
                $is_locked = false;
                if ($t['prerequisite_task_id']) {
                    // Check if prerequisite is completed
                    $check_stmt = $db->prepare("SELECT status FROM student_progress WHERE task_id = :prereq AND student_id = :stud");
                    $check_stmt->execute([':prereq' => $t['prerequisite_task_id'], ':stud' => $student_id]);
                    $prereq_status = $check_stmt->fetchColumn();
                    if ($prereq_status !== 'completed') {
                        $is_locked = true;
                    }
                }
            ?>
                <div class="flex flex-col items-center p-4 rounded-xl border-2 transition <?php echo $is_locked ? 'grayscale(1) opacity-50 border-white/10 bg-black/40' : 'border-cyan-400/40 bg-cyan-950/10 hover:scale-105 hover:border-cyan-400 cursor-pointer'; ?>"
                     data-task-id="<?php echo $t['id']; ?>"
                     data-anti-cheat="<?php echo $t['anti_cheat_active']; ?>"
                     data-deadline="<?php echo $t['deadline'] . ' ' . $t['deadline_time']; ?>">
                    <div class="text-xs text-white/50">#<?php echo $i+1; ?></div>
                    <div class="text-3xl my-2">👾</div>
                    <div class="text-sm font-bold text-center"><?php echo htmlspecialchars($t['title']); ?></div>
                    <div class="text-[10px] uppercase text-cyan-300"><?php echo $t['game_type']; ?></div>
                    
                    {/* Live countdown timer wrapper */}
                    <div class="text-xs font-mono font-bold text-rose-400 mt-2 countdown" data-time="<?php echo $t['deadline'] . 'T' . $t['deadline_time']; ?>">
                        --:--:--
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <script>
    // Live countdown engine acting on timestamps
    document.querySelectorAll('.countdown').forEach(el => {
        const targetTime = new Date(el.dataset.time).getTime();
        const taskId = el.parentElement.dataset.taskId;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetTime - now;

            if (distance < 0) {
                clearInterval(interval);
                el.innerHTML = "⚠️ MUDDATI O'TDI";
                // Trigger auto-fail POST endpoint
                fetch('fail_progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_id: taskId })
                });
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            el.innerHTML = hours.toString().padStart(2, '0') + ":" + 
                           minutes.toString().padStart(2, '0') + ":" + 
                           seconds.toString().padStart(2, '0');
        }, 1000);
    });

    // Anti-cheat visibility listener
    let activeTask = null; // sets to active task ID on click
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && activeTask) {
            const card = document.querySelector('[data-task-id="' + activeTask + '"]');
            if (card && card.dataset.antiCheat === '1') {
                alert('ANTI-CHEAT TRIGGERS! O\'yin bekor qilinib, Failed rejimiga o\'tkazildi.');
                fetch('fail_progress.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_id: activeTask, reason: 'Tab almashtirildi' })
                }).then(() => window.location.reload());
            }
        }
    });
    </script>
</body>
</html>`;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="ARCHITECT PANEL" title="Production-Ready backend & Baza" right={<Badge tone="cyan">PHP 8.2 · MySQL InnoDB</Badge>} />
      
      <div className="flex gap-2 flex-wrap">
        <Button tone={activeTab === "sql" ? "lime" : "secondary"} size="sm" onClick={() => setActiveTab("sql")}>🛢️ Database Schema (SQL)</Button>
        <Button tone={activeTab === "db" ? "lime" : "secondary"} size="sm" onClick={() => setActiveTab("db")}>🐘 Database Connection (db.php)</Button>
        <Button tone={activeTab === "teacher" ? "lime" : "secondary"} size="sm" onClick={() => setActiveTab("teacher")}>⚙️ Teacher Controller (PHP)</Button>
        <Button tone={activeTab === "student_map" ? "lime" : "secondary"} size="sm" onClick={() => setActiveTab("student_map")}>🎮 Student Map & Anti-Cheat (student_map.php)</Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3 flex-wrap gap-2">
          <div className="text-sm font-semibold text-white/80">
            {activeTab === "sql" && "Ma'lumotlar Bazasi Sxemasi (SQL / MySQL)"}
            {activeTab === "db" && "Ma'lumotlar Bazasiga Ulanish Singleton (db.php)"}
            {activeTab === "teacher" && "Teacher Controller va Konfiguratsiya Kiritish (PHP PDO)"}
            {activeTab === "student_map" && "Interactive Visual Map va JavaScript Anti-Cheat (student_map.php)"}
          </div>
          <div className="flex gap-2">
            <Button size="sm" tone="secondary" onClick={() => {
              const code = activeTab === "sql" ? sqlCode : activeTab === "db" ? phpDb : activeTab === "teacher" ? phpTeacher : phpStudentMap;
              navigator.clipboard.writeText(code);
              toast({ title: "✓ Nusxalandi", desc: "Kod buferga muvaffaqiyatli saqlandi", tone: "success" });
            }}>📋 Nusxa olish (Copy)</Button>
            <Button size="sm" onClick={() => {
              const el = document.createElement("a");
              const code = activeTab === "sql" ? sqlCode : activeTab === "db" ? phpDb : activeTab === "teacher" ? phpTeacher : phpStudentMap;
              const file = new Blob([code], {type: 'text/plain'});
              el.href = URL.createObjectURL(file);
              el.download = activeTab === "sql" ? "database.sql" : activeTab === "db" ? "db.php" : activeTab === "teacher" ? "TeacherController.php" : "student_map.php";
              el.click();
            }}>📥 Faylni Yuklab Olish</Button>
          </div>
        </div>

        <pre className="p-5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-cyan-200 overflow-x-auto max-h-[60vh]">
          {activeTab === "sql" && sqlCode}
          {activeTab === "db" && phpDb}
          {activeTab === "teacher" && phpTeacher}
          {activeTab === "student_map" && phpStudentMap}
        </pre>
      </Card>
    </div>
  );
}

export function RegistrationRequestsView() {
  const requests = useStore(s => s.registrationRequests);
  const groups = useStore(s => s.groups);
  const users = useStore(s => s.users);
  const approveReg = useStore(s => s.approveRegistrationRequest);
  const rejectReg = useStore(s => s.rejectRegistrationRequest);
  const assignGroup = useStore(s => s.assignGroupToTeacher);
  const toast = useStore(s => s.toast);

  const [rejectId, setRejectForId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const pending = requests.filter(r => r.status === "pending");
  const teachersList = users.filter(u => u.role === "teacher");

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="OWNER · REGS" title="Talabalar Ro'yxatdan O'tish So'rovlari" right={<Badge tone="amber">{pending.length} ta pending</Badge>} />
      <Card className="p-6">
        {pending.length === 0 ? (
          <div className="text-center py-12 text-white/50 text-sm">
            ✨ Kutilayotgan yangi talaba ro'yxatdan o'tish so'rovlari mavjud emas.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => {
              return (
                <div key={r.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">{r.id}</div>
                    <div className="text-white font-bold text-lg">{r.fio}</div>
                    <div className="text-xs text-cyan-300 font-semibold mt-0.5">Login: <span className="font-mono">@{r.login}</span></div>
                    <div className="text-xs text-white/70 space-y-0.5 mt-1">
                      <div>🏫 Universitet: <span className="text-white font-bold">{r.universityName}</span></div>
                      <div>🎨 Yo'nalish: <span className="text-white font-bold">{r.directionName}</span></div>
                      <div>👥 Guruh (Qo'lda kiritilgan): <span className="text-teal-300 font-bold">{r.groupName}</span></div>
                    </div>
                    <div className="text-[10px] text-white/50 mt-1.5">Yuborildi: {new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button tone="lime" size="sm" onClick={() => approveReg(r.id)}>✅ Tasdiqlash</Button>
                    <Button tone="danger" size="sm" onClick={() => { setRejectForId(r.id); setReason(""); }}>❌ Rad etish</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* OWNER ASSIGN GROUPS TO TEACHERS PANEL */}
      <Card className="p-6">
        <div className="border-b border-white/10 pb-3 mb-4 flex justify-between items-center gap-2 flex-wrap">
          <div>
            <h3 className="font-display font-bold text-white text-lg">🎓 Guruhlar Boshqaruvi (Guruh CRUD)</h3>
            <p className="text-white/60 text-xs mt-0.5">Yangi guruhlarni yarating, o'qituvchilar bilan bog'lang, tahrirlang yoki o'chiring.</p>
          </div>
          <Button size="sm" onClick={() => {
            const name = prompt("Guruh nomi:");
            const course = +(prompt("Kurs raqami (1-4):") || "1");
            if (name) {
              useStore.getState().createGroup(name, course, "tuit");
            }
          }}>+ Yangi Guruh Yaratish</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">Guruh Nomi</th><th>Universitet</th><th>Kurs</th><th>Hozirgi O'qituvchi</th><th>Amal / Biriktirish</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const currentTeacher = teachersList.find(t => t.id === g.teacherId);
                return (
                  <tr key={g.id} className="border-t border-white/5 hover:bg-white/[0.01]">
                    <td className="py-3 text-white font-bold">{g.name}</td>
                    <td className="text-white/70 text-xs">{g.universityId === "tuit" ? "TATU" : g.universityId}</td>
                    <td className="text-white font-mono font-bold text-xs">{g.course || 1}-kurs</td>
                    <td>
                      {currentTeacher ? (
                        <Badge tone="lime">{currentTeacher.fio}</Badge>
                      ) : (
                        <Badge tone="gray">Biriktirilmagan</Badge>
                      )}
                    </td>
                    <td className="py-2 flex items-center gap-2">
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            assignGroup(g.id, e.target.value);
                            toast({ title: "✓ Guruh biriktirildi!", desc: `${g.name} guruh darsi yangilandi`, tone: "success" });
                          }
                        }}
                        className="bg-[#161925] border border-white/10 text-xs text-white p-1.5 rounded focus:outline-none focus:border-cyan-400"
                        defaultValue=""
                      >
                        <option value="">O'qituvchini tanlang...</option>
                        {teachersList.map(t => (
                          <option key={t.id} value={t.id}>{t.fio}</option>
                        ))}
                      </select>

                      <button onClick={() => {
                        const name = prompt("Guruh nomi:", g.name);
                        const course = +(prompt("Kurs raqami:", String(g.course || 1)) || "1");
                        if (name) {
                          useStore.getState().updateGroup(g.id, name, course, g.teacherId);
                        }
                      }} className="text-xs text-cyan-300 hover:underline">Tahrirlash</button>
                      
                      <button onClick={() => {
                        if (confirm(`Ushbu ${g.name} guruhini butunlay o'chirib yuborishga ruxsat berasizmi?`)) {
                          useStore.getState().deleteGroup(g.id);
                        }
                      }} className="text-xs text-rose-400 hover:underline ml-2">🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REJECT WITH REASON MODAL */}
      <Modal open={!!rejectId} onClose={() => setRejectForId(null)} size="sm">
        <div className="font-display font-bold text-white mb-3">So'rovni Rad Etish Sababi</div>
        <Textarea label="Rad etish sababi:" value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="Masalan: Ma'lumotlar xato..." required />
        <div className="flex gap-2 mt-4">
          <Button tone="secondary" className="flex-1" onClick={() => setRejectForId(null)}>Bekor</Button>
          <Button tone="danger" className="flex-1" disabled={!reason} onClick={() => {
            rejectReg(rejectId!, reason);
            setRejectForId(null);
          }}>Rad etish</Button>
        </div>
      </Modal>
    </div>
  );
}

export function BanRequestsView() {
  const requests = useStore(s => s.banRequests);
  const approveBan = useStore(s => s.approveBanRequest);
  const rejectBan = useStore(s => s.rejectBanRequest);

  const pending = requests.filter(r => r.status === "pending");

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle eyebrow="OWNER · BANS" title="O'qituvchilardan Ban Arizalari" right={<Badge tone="red">{pending.length} ta kutilmoqda</Badge>} />
      
      <Card className="p-6">
        {pending.length === 0 ? (
          <div className="text-center py-12 text-white/50 text-sm">
            ✨ Kutilayotgan talaba ban so'rovlari mavjud emas.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">{r.id}</div>
                  <div className="text-white font-bold text-lg">{r.studentName} (Student)</div>
                  <div className="text-xs text-rose-300 font-bold mt-0.5">Sabab: {r.reason}</div>
                  <div className="text-xs text-white/70 mt-1">Yuboruvchi o'qituvchi: <span className="text-white font-bold">{r.teacherName}</span></div>
                  <div className="text-[10px] text-white/50 mt-1.5">Sana: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button tone="danger" size="sm" onClick={() => approveBan(r.id)}>✅ Banlashni tasdiqlash</Button>
                  <Button tone="secondary" size="sm" onClick={() => rejectBan(r.id)}>✕ Rad etish</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AssignSubjectsView() {
  const teachers = useStore(s => s.users).filter(u => u.role === "teacher");
  const subjects = useStore(s => s.subjects);
  const groups = useStore(s => s.groups);
  const teacherSubjects = useStore(s => s.teacherSubjects);
  
  const assignTS = useStore(s => s.assignTeacherSubject);
  const removeTS = useStore(s => s.removeTeacherSubject);
  const toast = useStore(s => s.toast);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ teacherId: "", subjectId: "", groupId: "" });

  const handleSaveAssignment = async () => {
    if (!form.teacherId || !form.subjectId || !form.groupId) {
      toast({ title: "Xato", desc: "Barcha maydonlarni tanlang!", tone: "error" });
      return;
    }
    const success = await assignTS(form.teacherId, form.subjectId, form.groupId);
    if (success) {
      setOpen(false);
      setForm({ teacherId: "", subjectId: "", groupId: "" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle eyebrow="OWNER · ACADEMICS" title="Kafedra Fan Biriktirish Paneli" right={<Button onClick={() => setOpen(true)}>+ Yangi Biriktirish</Button>} />
      
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">O'qituvchi (Teacher)</th><th>Dars Fani</th><th>Talabalar Guruhi</th><th></th>
              </tr>
            </thead>
            <tbody>
              {teacherSubjects.map(ts => {
                const teacher = teachers.find(t => t.id === ts.teacherId);
                const subject = subjects.find(s => s.id === ts.subjectId);
                const group = groups.find(g => g.id === ts.groupId);
                return (
                  <tr key={ts.id} className="border-t border-white/5 hover:bg-white/[0.01]">
                    <td className="py-3 text-white font-bold">{teacher?.fio || "—"}</td>
                    <td className="text-cyan-300 font-semibold">{subject?.name || "—"}</td>
                    <td className="text-lime-300 font-bold">{group?.name || "—"}</td>
                    <td className="text-right">
                      <Button tone="secondary" size="sm" className="text-rose-400 border-rose-500/25" onClick={() => {
                        if (confirm("Ushbu dars biriktirishni bekor qilishga ruxsat berasizmi?")) {
                          removeTS(ts.id);
                        }
                      }}>❌ Biriktirishni bekor qilish</Button>
                    </td>
                  </tr>
                );
              })}
              {teacherSubjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-white/50">Hozircha fan biriktirishlar kiritilmagan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* NEW ASSIGNMENT MODAL */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-4">📚 Yangi Dars / Fan Biriktirish</div>
        <div className="space-y-3">
          <Select label="O'qituvchini tanlang (Teacher):" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
            <option value="">O'qituvchini tanlang...</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.fio}</option>)}
          </Select>

          <Select label="Kafedra Fanini tanlang (Subject):" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">Fanni tanlang...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <Select label="Talabalar Guruhini tanlang (Group):" value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}>
            <option value="">Guruhni tanlang...</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>

          <div className="flex gap-2 pt-3 border-t border-white/15">
            <Button tone="secondary" className="flex-1" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button tone="lime" className="flex-1" onClick={handleSaveAssignment}>💾 Saqlash va biriktirish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function SubjectsCrudView() {
  const subjects = useStore(s => s.subjects);
  const createSub = useStore(s => s.createSubject);
  const updateSub = useStore(s => s.updateSubject);
  const deleteSub = useStore(s => s.deleteSubject);
  const toast = useStore(s => s.toast);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", academicYear: "2026-2027", semester: 2, icon: "💻", bannerColor: "from-cyan-500 to-blue-700" });

  const handleCreateSubject = () => {
    if (!form.name || !form.academicYear || !form.semester) {
      toast({ title: "Xato", desc: "Barcha maydonlarni to'ldiring!", tone: "error" });
      return;
    }
    createSub(form.name, form.academicYear, form.semester, form.icon, form.bannerColor);
    setOpen(false);
    setForm({ name: "", academicYear: "2026-2027", semester: 2, icon: "💻", bannerColor: "from-cyan-500 to-blue-700" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionTitle eyebrow="OWNER · ACADEMICS" title="Kafedra Fanlari Boshqaruvi (Ruchnoy)" right={<Button onClick={() => setOpen(true)}>+ Yangi Fan Qo'shish</Button>} />
      
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 text-xs uppercase tracking-wider">
                <th className="py-2">Fan Iconi</th><th>Fan Nomi</th><th>O'quv Yili</th><th>Semestr</th><th></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.01]">
                  <td className="py-3 text-2xl">{s.icon}</td>
                  <td className="text-white font-bold text-base">{s.name}</td>
                  <td className="text-white/70 font-mono text-xs">{s.academicYear}</td>
                  <td className="text-teal-300 font-bold">{s.semester}-semestr</td>
                  <td className="text-right">
                    <Button tone="secondary" size="sm" className="mr-2" onClick={() => {
                      const name = prompt("Yangi fan nomi:", s.name);
                      const year = prompt("O'quv yili:", s.academicYear);
                      const sem = +(prompt("Semestr (1-2):", String(s.semester)) || "2");
                      if (name && year) {
                        updateSub(s.id, name, year, sem);
                      }
                    }}>Tahrirlash</Button>
                    <Button tone="secondary" size="sm" className="text-rose-400 border-rose-500/25" onClick={() => {
                      if (confirm(`Ushbu ${s.name} fanini butunlay o'chirib yuborishga ruxsat berasizmi?`)) {
                        deleteSub(s.id);
                      }
                    }}>🗑 O'chirish</Button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-white/50">Hozircha dars fanlari kiritilmagan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* NEW SUBJECT MODAL */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="font-display text-xl font-bold text-white mb-4">💻 Yangi Kafedra Fani Qo'shish</div>
        <div className="space-y-3">
          <Input label="Fan Nomi:" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Sun'iy Intellekt Asoslari" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="O'quv Yili:" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} placeholder="2026-2027" />
            <Select label="Semestr:" value={form.semester} onChange={e => setForm({ ...form, semester: +e.target.value })}>
              <option value={1}>1-Semestr</option>
              <option value={2}>2-Semestr</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Fan Emojisi (Icon):" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
              <option value="💻">💻 Kompyuter</option>
              <option value="📐">📐 Oliy Matematika</option>
              <option value="✍️">✍️ Ona Tili</option>
              <option value="🛢️">🛢️ Ma'lumotlar Bazasi</option>
              <option value="🧠">🧠 Sun'iy Intellekt</option>
              <option value="🧪">🧪 Kimyo/Fizika</option>
            </Select>
            <Select label="Banner Rang (Gradients):" value={form.bannerColor} onChange={e => setForm({ ...form, bannerColor: e.target.value })}>
              <option value="from-cyan-500 to-blue-700">Cyan → Blue</option>
              <option value="from-violet-500 to-fuchsia-700">Violet → Fuchsia</option>
              <option value="from-lime-500 to-emerald-700">Lime → Emerald</option>
              <option value="from-amber-500 to-orange-700">Amber → Orange</option>
            </Select>
          </div>

          <div className="flex gap-2 pt-3 border-t border-white/15">
            <Button tone="secondary" className="flex-1" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button tone="lime" className="flex-1" onClick={handleCreateSubject}>💾 Fanini Qo'shish</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
