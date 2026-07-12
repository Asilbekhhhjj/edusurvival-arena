import { useState, useEffect } from "react";
import { Shell } from "./components/Shell";
import { OwnerView } from "./views/OwnerView";
import { TeacherView } from "./views/TeacherView";
import { StudentView } from "./views/StudentView";
import { Login } from "./pages/Login";
import { ToastLayer } from "./components/UI";
import { useCurrentUser, useStore } from "./store";

export default function App() {
  const user = useCurrentUser();
  const [page, setPage] = useState("overview");
  const [hydrated, setHydrated] = useState(false);

  // Rehydrate state on load
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => unsub();
  }, []);

  // Reset page when user changes
  useEffect(() => { setPage("overview"); }, [user?.id]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#020204] flex flex-col items-center justify-center text-white font-sans relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="relative z-10 text-center space-y-4 animate-pulse">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-400 via-cyan-500 to-indigo-600 grid place-items-center font-black text-black text-3xl mx-auto">E</div>
          <div className="font-display font-black text-white tracking-widest text-lg">EDUSURVIVAL</div>
          <p className="text-white/40 text-xs tracking-wider">KIBER-BAZA YUKLANMOQDA (Rehydrating Database)...</p>
          <div className="w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 w-2/3 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <ToastLayer />
      </>
    );
  }

  return (
    <>
      <Shell page={page} setPage={setPage}>
        {user.role === "owner"   && <OwnerView page={page} setPage={setPage} />}
        {user.role === "teacher" && <TeacherView page={page} setPage={setPage} />}
        {user.role === "student" && <StudentView page={page} setPage={setPage} />}
      </Shell>
      <ToastLayer />
    </>
  );
}
