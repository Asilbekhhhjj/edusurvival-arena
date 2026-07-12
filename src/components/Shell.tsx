import { useState } from "react";
import type { Role } from "../types";
import { cn } from "../utils/cn";
import { useCurrentUser, useStore } from "../store";
import { formatMoney } from "./UI";

const roleMeta: Record<Role, { label: string; color: string; icon: string; sub: string }> = {
  owner:   { label: "OWNER",   color: "from-fuchsia-500 to-violet-600",  icon: "👑", sub: "Ahmedov Asilbek" },
  teacher: { label: "TEACHER", color: "from-amber-500 to-orange-600",    icon: "🎓", sub: "O'qituvchi" },
  student: { label: "STUDENT", color: "from-lime-500 to-emerald-600",    icon: "🎮", sub: "Talaba" },
};

const menus: Record<Role, { key: string; label: string; icon: string }[]> = {
  owner: [
    { key: "overview", label: "Umumiy panel",       icon: "◈" },
    { key: "requests", label: "Yangi So'rovlar",    icon: "🔔" },
    { key: "ban_requests", label: "Ban Arizalari",  icon: "🚨" },
    { key: "subjects_crud", label: "Kafedra Fanlari", icon: "⚙️" },
    { key: "assign_subjects", label: "Fan Biriktirish", icon: "📚" },
    { key: "unis",     label: "Universitetlar",     icon: "🏛" },
    { key: "users",    label: "Foydalanuvchilar",   icon: "👥" },
    { key: "revenue",  label: "Daromad va do'kon",  icon: "💰" },
    { key: "backend",  label: "Backend & Baza",     icon: "💻" },
    { key: "ads",      label: "Reklama boshqaruv",  icon: "📢" },
    { key: "bans",     label: "Qora ro'yxat (Ban)", icon: "⛔" },
    { key: "logs",     label: "Tizim loglari",      icon: "📜" },
  ],
  teacher: [
    { key: "overview", label: "Mening guruhlarim",  icon: "◈" },
    { key: "realtime", label: "🔴 LIVE Monitor",     icon: "📡" },
    { key: "tasks",    label: "Topshiriqlar",       icon: "📝" },
    { key: "grading",  label: "Tekshirish navbati", icon: "✅" },
    { key: "extensions", label: "Muddat So'rovlari", icon: "⏳" },
    { key: "criteria", label: "Baholash mezonlari", icon: "⚖️" },
    { key: "students", label: "Talabalar reytingi", icon: "🏆" },
  ],
  student: [
    { key: "overview", label: "Mening arenam",      icon: "◈" },
    { key: "map",      label: "O'yin xaritasi",      icon: "🗺" },
    { key: "tasks",    label: "Topshiriqlar",       icon: "📝" },
    { key: "shop",     label: "Do'kon (Balans)",    icon: "🪙" },
    { key: "history",  label: "Tarix va loglar",    icon: "📜" },
  ],
};

interface Props {
  page: string;
  setPage: (p: string) => void;
  children: React.ReactNode;
}

export function Shell({ page, setPage, children }: Props) {
  const user = useCurrentUser();
  const logout = useStore(s => s.logout);
  const toast = useStore(s => s.toast);
  const universities = useStore(s => s.universities);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  if (!user) return null;
  const meta = roleMeta[user.role];
  const items = menus[user.role];
  const uni = user.universityId ? universities.find(u => u.id === user.universityId) : null;

  return (
    <div className="min-h-screen arena-bg relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-md bg-black/30">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4 px-4 md:px-6 h-16">
          <button onClick={() => setMobileOpen(v => !v)} className="md:hidden text-white/70 hover:text-white px-2">☰</button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lime-400 via-cyan-400 to-violet-500 grid place-items-center font-black text-black">E</div>
            <div>
              <div className="font-display font-black tracking-widest text-sm text-white">EDU<span className="text-lime-400">SURVIVAL</span></div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 -mt-0.5">Tizim · v7.2</div>
            </div>
          </div>

          {uni && (
            <div className="hidden lg:flex ml-6 items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs">
              <span className="text-white/40">🏛</span>
              <span className="text-white/80 font-semibold">{uni.short}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/60">{uni.city}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {user.role === "student" && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-400/30 text-xs">
                <span>🪙</span>
                <span className="text-amber-300 font-bold">{formatMoney(user.wallet || 0)}</span>
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-lime-400 pulse-ring"></span>
              <span className="text-white/70">Live</span>
            </div>

            {/* Profile */}
            <div className="relative">
              <button onClick={() => setUserMenu(v => !v)} className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-lg">
                <div className={cn("w-9 h-9 rounded-lg grid place-items-center bg-gradient-to-br text-lg", meta.color)}>{meta.icon}</div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white">{user.fio}</div>
                  <div className="text-[10px] text-white/40">{meta.label} · {meta.sub}</div>
                </div>
              </button>
              {userMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 glass rounded-xl p-3 z-30">
                  <div className="px-3 py-2 border-b border-white/10 mb-2">
                    <div className="text-white font-semibold text-sm">{user.fio}</div>
                    <div className="text-[11px] text-white/50 font-mono">@{user.login}</div>
                    {user.ip && <div className="text-[10px] text-white/40 font-mono mt-1">IP: {user.ip}</div>}
                  </div>
                  <button onClick={() => { logout(); toast({ title: "Chiqdingiz", tone: "info" }); }} className="w-full text-left px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 rounded-lg">
                    🚪 Tizimdan chiqish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-[1600px] mx-auto flex">
        {/* Sidebar */}
        <aside className={cn(
          "w-64 shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-md min-h-[calc(100vh-64px)] px-3 py-6",
          "md:block", mobileOpen ? "block absolute z-30 h-full" : "hidden"
        )}>
          <div className="px-3 mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">Aktiv panel</div>
            <div className={cn("text-sm font-display font-bold bg-gradient-to-r bg-clip-text text-transparent", meta.color)}>{meta.label} PANEL</div>
          </div>
          <nav className="space-y-1">
            {items.map(it => {
              const pendingRequestsCount = useStore(s => s.registrationRequests.filter(r => r.status === "pending").length);
              const pendingBanCount = useStore(s => s.banRequests.filter(r => r.status === "pending").length);
              
              // Only get extension requests for tasks created by THIS teacher!
              const teacherTasks = useStore(s => s.tasks).filter(t => t.teacherId === user.id);
              const pendingExtCount = useStore(s => s.extensionRequests.filter(r => r.status === "pending" && teacherTasks.some(t => t.id === r.taskId)).length);

              const isRequestTab = it.key === "requests" && user.role === "owner";
              const isBanRequestTab = it.key === "ban_requests" && user.role === "owner";
              const isExtTab = it.key === "extensions" && user.role === "teacher";

              return (
                <button
                  key={it.key}
                  onClick={() => { setPage(it.key); setMobileOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 text-left text-sm px-3 py-2.5 rounded-lg transition-all relative",
                    page === it.key
                      ? "bg-white/10 text-white border border-white/10 shadow-inner"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <span className="w-5 text-center">{it.icon}</span>
                  <span className="flex-1">{it.label}</span>
                  {isRequestTab && pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black absolute right-3 animate-pulse">
                      🔔 {pendingRequestsCount}
                    </span>
                  )}
                  {isBanRequestTab && pendingBanCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black absolute right-3 animate-pulse">
                      🚨 {pendingBanCount}
                    </span>
                  )}
                  {isExtTab && pendingExtCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-500 text-black text-[10px] font-black absolute right-3 animate-pulse">
                      ⏳ {pendingExtCount}
                    </span>
                  )}
                  {page === it.key && !isRequestTab && !isBanRequestTab && !isExtTab && <span className="w-1.5 h-1.5 rounded-full bg-lime-400"></span>}
                </button>
              );
            })}
          </nav>

          <SeasonBadge />
          {user.role === "owner" && <SeasonResetButton />}
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

function SeasonBadge() {
  const season = useStore(s => s.currentSeason);
  const startedAt = useStore(s => s.seasonStartedAt);
  const days = Math.floor((Date.now() - startedAt) / 86400000);
  return (
    <div className="mt-8 mx-2 rounded-xl border border-white/10 bg-gradient-to-br from-violet-600/20 to-cyan-600/10 p-4">
      <div className="text-xs font-display tracking-widest text-lime-300">SEZON {season} · FAOL</div>
      <div className="text-white text-sm font-semibold mt-1">{days} kun boshlanganiga</div>
      <div className="text-white/50 text-xs mt-1">Semestr oxirida barcha ballar nolga tushadi.</div>
    </div>
  );
}

function SeasonResetButton() {
  const reset = useStore(s => s.archiveAndResetSemester);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mt-3 mx-2">
      {!confirm ? (
        <button onClick={() => setConfirm(true)} className="w-full text-xs px-3 py-2 rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20">
          🔥 CRON: Semestrni Yakunlash
        </button>
      ) : (
        <div className="p-2 rounded-lg border border-rose-400/40 bg-rose-500/10">
          <div className="text-[10px] text-rose-200 mb-2">Barcha fan ballari arxivlanadi va nolga tushadi!</div>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => setConfirm(false)} className="text-xs px-2 py-1 rounded bg-white/5 text-white/70">Bekor</button>
            <button onClick={() => {
              reset();
              setConfirm(false);
            }} className="text-xs px-2 py-1 rounded bg-rose-500/30 text-rose-100 font-bold">Arxivlash</button>
          </div>
        </div>
      )}
    </div>
  );
}
