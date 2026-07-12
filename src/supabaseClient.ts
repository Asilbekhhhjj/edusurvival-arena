import { createClient } from "@supabase/supabase-js";

// Real Supabase ulanishi - Production muhiti uchun import.meta.env drayveri orqali yuklanadi
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Jaccard similarity va So'z chastotasi tahlili asosida ishlaydigan DETERMINISTIK plagiat hisoblash drayveri
export function calculateOriginality(studentText: string, databaseTextPool: string[]): number {
  const cleanAndTokenize = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "") // tinish belgilarini tozalash
      .split(/\s+/)
      .filter(w => w.length > 2); // juda qisqa so'zlarni tashlab yuborish
  };

  const studentTokens = cleanAndTokenize(studentText);
  if (studentTokens.length === 0) return 100;
  if (databaseTextPool.length === 0) return 100;

  const studentSet = new Set(studentTokens);
  let maxSimilarity = 0;

  for (const dbText of databaseTextPool) {
    if (!dbText) continue;
    
    // Agar o'yin natijasi, kvitansiya yoki mock xabari bo'lsa, solishtirishdan chetda qoldiramiz
    if (dbText.startsWith("[O'yin") || dbText.startsWith("[Sug'urtalangan")) continue;

    const dbTokens = cleanAndTokenize(dbText);
    if (dbTokens.length === 0) continue;

    const dbSet = new Set(dbTokens);

    // Jaccard Index = Intersection / Union
    const intersection = new Set([...studentSet].filter(x => dbSet.has(x)));
    const union = new Set([...studentSet, ...dbSet]);

    const jaccardSimilarity = intersection.size / union.size;

    if (jaccardSimilarity > maxSimilarity) {
      maxSimilarity = jaccardSimilarity;
    }
  }

  // Originality = (1 - maxSimilarity) * 100
  const finalOriginality = (1 - maxSimilarity) * 100;
  
  // Natijani to'g'ri deterministik yaxlitlash
  return Math.round(finalOriginality * 10) / 10;
}
