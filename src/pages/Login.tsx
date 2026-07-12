import { useState } from "react";
import { useStore } from "../store";
import { Input, Button, Modal, Select } from "../components/UI";

export function Login() {
  const login = useStore(s => s.login);
  const toast = useStore(s => s.toast);
  const submitReg = useStore(s => s.submitRegistrationRequest);
  const universities = useStore(s => s.universities).filter(u => u.active);

  const [l, setL] = useState("");
  const [p, setP] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Registration state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isRegSuccess, setIsRegSuccess] = useState(false); // New success overlay state
  const [regFio, setRegFio] = useState("");
  const [regLogin, setRegLogin] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regUniversity, setRegUniversity] = useState("");
  const [regDirection, setRegDirection] = useState("");
  const [regGroupName, setRegGroupName] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFio || !regLogin || !regPassword || !regUniversity || !regDirection || !regGroupName) {
      toast({ title: "Xato", desc: "Barcha maydonlarni to'ldiring", tone: "error" });
      return;
    }
    const r = await submitReg(regFio, regLogin, regPassword, regUniversity, regDirection, regGroupName);
    if (r.ok) {
      toast({
        title: "⏳ So'rov yuborildi!",
        desc: "Ahmedov Asilbek tasdiqlashini kuting",
        tone: "success"
      });
      // Show explicit success screen on form
      setIsRegSuccess(true);
      setRegFio("");
      setRegLogin("");
      setRegPassword("");
      setRegUniversity("");
      setRegDirection("");
      setRegGroupName("");
    } else {
      toast({ title: "Xato", desc: r.msg || "So'rov yuborishda xatolik", tone: "error" });
    }
  };

  const [secretPin, setSecretPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Owner Security (Maxfiy Kod 0077) check
    if (l === "dark" && !showPinInput) {
      setShowPinInput(true);
      toast({ title: "🛡️ Maxfiy Kod Talab Etiladi", desc: "Iltimos, daxlsiz Owner parolidan so'ng 4 xonali PIN kodni kiriting", tone: "warning" });
      return;
    }

    if (l === "dark" && showPinInput) {
      if (secretPin !== "0077") {
        setErr("Xavfsizlik: Maxfiy kod noto'g'ri!");
        toast({ title: "Ruxsat Berilmadi", desc: "Xavfsizlik: Maxfiy kod noto'g'ri!", tone: "error" });
        return;
      }
    }

    const r = await login(l, p);
    if (!r.ok) {
      setErr(r.msg || "Xatolik");
      toast({ title: "Kirish rad etildi", desc: r.msg, tone: "error" });
    } else {
      toast({ title: "Xush kelibsiz!", desc: `${l} sifatida kirdingiz`, tone: "success" });
    }
  };

  return (
    <div className="min-h-screen bg-[#020204] arena-bg grid-bg grid place-items-center p-4 relative overflow-hidden font-sans">
      {/* Dark Cyber/Web visual elements */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl" />

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 relative z-10">
        {/* Left: branding */}
        <div className="flex flex-col justify-center p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-400 via-cyan-500 to-indigo-600 grid place-items-center font-black text-black text-2xl">E</div>
            <div>
              <div className="font-display font-black tracking-widest text-white text-lg">EDU<span className="text-teal-400">SURVIVAL</span></div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Dark Web Edition</div>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-white leading-tight">
            Ta'limda <span className="bg-gradient-to-r from-teal-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent font-sans italic">omon qolish</span> vaqti.
          </h1>
          <p className="text-white/60 mt-4 max-w-md">
            50 ballik tanga tizimi. 15 bosqichli xarita. Cheat-detektor doim ogoh. Mustaqil ishlarni yozuvdan qutqaring.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-white/60"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> Avtomatik ball hisoblash</div>
            <div className="flex items-center gap-2 text-white/60"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> HEMIS sinxronizatsiya</div>
            <div className="flex items-center gap-2 text-white/60"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Anti-cheat AI radar</div>
            <div className="flex items-center gap-2 text-white/60"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Ban tizimi</div>
          </div>
        </div>

        {/* Right: login form */}
        <div className="glass bg-black/40 border border-white/5 rounded-2xl p-8 relative scanline">
          <div className="text-[10px] tracking-[0.35em] uppercase text-teal-400 font-bold">KIBER XAVFSIZ TIZIM</div>
          <h2 className="font-display font-black text-2xl text-white mt-1">Tizimga kiring</h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input label="Login" placeholder="login" value={l} onChange={e => setL(e.target.value)} required autoFocus />
            
            {/* Password input with toggle eye */}
            <div className="relative">
              <Input
                label="Parol"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={p}
                onChange={e => setP(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 bottom-2.5 text-white/50 hover:text-white transition text-xs font-semibold"
              >
                {showPassword ? "👀 Yashirish" : "👁️ Ko'rsatish"}
              </button>
            </div>

            {/* OWNER SECRET PIN CODE INPUT */}
            {showPinInput && (
              <Input
                label="Owner Maxfiy PIN Kodi:"
                type="password"
                placeholder="••••"
                value={secretPin}
                onChange={(e: any) => setSecretPin(e.target.value)}
                maxLength={4}
                required
                autoFocus
              />
            )}

            {err && <div className="text-rose-400 text-xs">{err}</div>}
            <Button tone="lime" size="lg" className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-black font-black" type="submit">
              {showPinInput ? "🔓 OWNER KIRISH" : "▶ KIRISH"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-3">
            <div className="flex gap-2 justify-between items-center text-xs mt-1">
              <span className="text-white/40">Tizimda hisobingiz yo'qmi?</span>
              <button type="button" onClick={() => setIsRegisterOpen(true)} className="text-teal-400 hover:text-teal-300 font-bold underline cursor-pointer">
                Talaba Bo'lib Ro'yxatdan O'tish
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENT REGISTRATION FORM MODAL (Yopiq Tizim Ro'yxatdan O'tish) */}
      <Modal open={isRegisterOpen} onClose={() => { setIsRegisterOpen(false); setIsRegSuccess(false); }}>
        {isRegSuccess ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="text-6xl">✅</div>
            <div>
              <h3 className="font-display font-bold text-white text-lg">So'rovingiz yuborildi!</h3>
              <p className="text-sm text-white/60 mt-1 max-w-sm mx-auto">
                Ma'lumotlaringiz administratorga muvaffaqiyatli yuborildi. 
                So'rovingiz ko'rib chiqilishini kuting — tasdiqlangach, tizimga kira olasiz.
              </p>
            </div>
            <Button tone="lime" className="w-full mt-4" onClick={() => { setIsRegisterOpen(false); setIsRegSuccess(false); }}>
              Oynani yopish (Kutish)
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 relative z-20">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-white text-lg">📝 Talaba Bo'lib Ro'yxatdan O'tish</h3>
              <p className="text-white/60 text-xs mt-0.5">So'rovingiz Owner (Ahmedov Asilbek) paneliga kelib tushadi.</p>
            </div>

            <div className="space-y-3">
              <Input label="F.I.Sh (Ism Familiyangiz):" value={regFio} onChange={(e: any) => setRegFio(e.target.value)} placeholder="Masalan: Nodirbek Yusupov" required />
              <Input label="Tizim uchun yangi Login (username):" value={regLogin} onChange={(e: any) => setRegLogin(e.target.value)} placeholder="Masalan: nodir_dev" required />
              
              <div className="relative">
                <Input label="Boshlang'ich Parol:" type={showRegPassword ? "text" : "password"} value={regPassword} onChange={(e: any) => setRegPassword(e.target.value)} placeholder="••••••••" required />
                <button type="button" onClick={() => setShowRegPassword(v => !v)} className="absolute right-3 bottom-2.5 text-white/50 hover:text-white transition text-xs font-semibold">
                  {showRegPassword ? "Yashirish" : "Ko'rsatish"}
                </button>
              </div>

              {/* DYNAMIC UNIVERSITY SELECTION FROM OWNER APPROVED LIST */}
              <Select label="Qaysi universitetni tanlaysiz?" value={regUniversity} onChange={(e: any) => setRegUniversity(e.target.value)} required>
                <option value="">Universitetni tanlang...</option>
                {universities.map(u => (
                  <option key={u.id} value={u.name}>{u.short} — {u.name}</option>
                ))}
              </Select>

              <Input label="Yo'nalish (Soha/Fakultet):" value={regDirection} onChange={(e: any) => setRegDirection(e.target.value)} placeholder="Masalan: Dasturiy Injiniring" required />
              <Input label="Guruh (Qo'lda kiriting):" value={regGroupName} onChange={(e: any) => setRegGroupName(e.target.value)} placeholder="Masalan: 710-22" required />
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10">
              <Button type="button" tone="secondary" className="flex-1" onClick={() => setIsRegisterOpen(false)}>Bekor qilish</Button>
              <Button type="submit" tone="lime" className="flex-1">▶ Ro'yxatdan O'tish</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}


