import { useEffect } from "react";

interface Options {
  active: boolean;
  onViolation: (type: string) => void;
}

/**
 * Real anti-cheat detector.
 * Tracks: window.onblur, contextmenu, keyboard shortcuts (PrintScreen, Ctrl/Cmd+C/V/S, DevTools),
 * visibility changes, and text selection.
 */
export function useCheatDetector({ active, onViolation }: Options) {
  useEffect(() => {
    if (!active) return;

    const onBlur = () => onViolation("Fokus yo'qoldi (window.onblur)");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onViolation("Sahifa yashirildi (visibility)");
    };
    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); onViolation("O'ng tugma bosildi"); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") { onViolation("PrintScreen bosildi"); return; }
      if ((e.ctrlKey || e.metaKey) && ["c","v","x","s","p","a","u"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        onViolation(`Klaviatura kombinatsiyasi: Ctrl+${e.key.toUpperCase()}`);
        return;
      }
      // Win+Shift+S (Snipping Tool)
      if (e.shiftKey && e.metaKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onViolation("Win+Shift+S (Snipping Tool)");
      }
      // DevTools shortcuts
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        onViolation("DevTools ochilishga urinildi");
      }
    };
    const onSelectStart = (e: Event) => { e.preventDefault(); };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); onViolation("Nusxa ko'chirish"); };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKey);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("copy", onCopy);

    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("copy", onCopy);
    };
  }, [active, onViolation]);
}
