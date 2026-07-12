import type { Stage, GameMode } from "../types";

export const GAME_MODE_META: Record<GameMode, { name: string; icon: string; desc: string; difficulty: number; color: string }> = {
  dark_maze:      { name: "Zulmat Labirinti",  icon: "🌑", desc: "Faqat to'g'ri javob yo'lni yoritadi. Xato = vaqt qisqaradi.", difficulty: 3, color: "from-slate-700 to-slate-900" },
  time_bomb:      { name: "Vaqt Bombasi",       icon: "💣", desc: "Countdown ostida qiyin masalani yeching.", difficulty: 4, color: "from-red-600 to-orange-700" },
  crypto_breaker: { name: "Kod Shifri",         icon: "🔐", desc: "Shifrni oching — mantiqiy zanjirni toping.", difficulty: 4, color: "from-emerald-600 to-teal-700" },
  chain_reaction: { name: "Zanjirli Reaksiya",  icon: "⛓", desc: "Bitta xato — oldingi javoblar ham yonadi.", difficulty: 5, color: "from-yellow-600 to-red-600" },
  boss_fight:     { name: "Boss Jangi",         icon: "👹", desc: "3 fazali super-topshiriq. Modul yakuni.", difficulty: 5, color: "from-fuchsia-600 to-violet-700" },
  deep_dive:      { name: "Arxeologik Qazilma", icon: "🏺", desc: "Ma'lumotlar ichidan to'g'ri faktlarni ajrating.", difficulty: 3, color: "from-amber-700 to-yellow-800" },
  minesweeper:    { name: "Minasiz Maydon",     icon: "💥", desc: "Noto'g'ri javoblar — mina. Portlamang!", difficulty: 4, color: "from-gray-700 to-slate-800" },
  blueprint:      { name: "Arxitektor",          icon: "📐", desc: "Elementlardan to'g'ri formulani tuzing.", difficulty: 4, color: "from-blue-600 to-indigo-700" },
  pvp_arena:      { name: "PVP Arena",          icon: "⚔️", desc: "Boshqa talaba bilan tezlik poygasi.", difficulty: 5, color: "from-rose-600 to-pink-700" },
  bug_hunter:     { name: "Bug Hunter",         icon: "🐛", desc: "Kod yoki formuladan yashirin xatoni toping.", difficulty: 3, color: "from-green-600 to-emerald-700" },
  hardcore:       { name: "Hardcore Mode",       icon: "💀", desc: "Faqat 3 ta hayot. Xato = level boshiga.", difficulty: 5, color: "from-red-700 to-black" },
  tower_defense:  { name: "Minorani Himoya",     icon: "🏰", desc: "To'g'ri javob — kuchayadi, xato — buziladi.", difficulty: 4, color: "from-cyan-600 to-blue-700" },
  evolving:       { name: "Evolyutsiya",         icon: "🧬", desc: "Har savol avvalgidan qiyinroq.", difficulty: 4, color: "from-violet-600 to-purple-700" },
  paradox:        { name: "Paradoks",           icon: "♾️", desc: "Bir-biriga zid holatdan mantiq bilan chiqing.", difficulty: 5, color: "from-indigo-600 to-violet-800" },
  judgment:       { name: "Oliy Sud",           icon: "⚖️", desc: "Muammoni tahlil qilib argumentlarni tizing.", difficulty: 4, color: "from-amber-500 to-orange-700" },
};

export const ALL_MODES: GameMode[] = [
  "dark_maze", "time_bomb", "crypto_breaker", "chain_reaction", "boss_fight",
  "deep_dive", "minesweeper", "blueprint", "pvp_arena", "bug_hunter",
  "hardcore", "tower_defense", "evolving", "paradox", "judgment",
];

/* Payload generators for each mode */
export function generatePayload(mode: GameMode, seed: number = Date.now()): any {
  const rnd = mulberry32(seed);

  switch (mode) {
    case "dark_maze": {
      // 4x4 grid; player answers questions to reveal next cells
      return {
        rounds: 4,
        questions: [
          { q: "log₂(64) = ?", options: ["4", "6", "8", "16"], correct: 1 },
          { q: "Stack (LIFO) uchun to'g'ri operatsiya?", options: ["enqueue", "push", "select", "join"], correct: 1 },
          { q: "O(n log n) — bu qanday algoritm?", options: ["Bubble", "Merge sort", "Linear search", "Constant"], correct: 1 },
          { q: "SQL da UNIQUE cheklovi nimani ta'minlaydi?", options: ["Tartib", "Takrorlanmaslik", "Tezlik", "Xotira"], correct: 1 },
        ],
      };
    }
    case "time_bomb": {
      const a = 12 + Math.floor(rnd() * 30);
      const b = 5 + Math.floor(rnd() * 15);
      const answer = a * b;
      const options = shuffle([answer, answer + 10, answer - 7, answer + 23], rnd);
      return {
        seconds: 30,
        q: `Tezda hisoblang: ${a} × ${b} = ?`,
        options: options.map(String),
        correctIndex: options.indexOf(answer),
      };
    }
    case "crypto_breaker": {
      // Caesar cipher with shift 3
      const words = ["ARENA", "TANGA", "BILIM", "KODEKS"];
      const original = words[Math.floor(rnd() * words.length)];
      const shift = 3;
      const encoded = original.split("").map(c => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65)).join("");
      return { encoded, shift, answer: original };
    }
    case "chain_reaction": {
      return {
        chain: [
          { q: "HTTP 200 → ?", options: ["Xato", "OK", "Redirect", "Timeout"], correct: 1 },
          { q: "JSON ni parse qiluvchi JS metod?", options: ["JSON.parse()", "parseInt()", "eval()", "toObject()"], correct: 0 },
          { q: "Git da o'chgan branch qaytariladi?", options: ["reflog", "delete", "commit", "merge"], correct: 0 },
          { q: "CSS `flex: 1` nimani anglatadi?", options: ["Yashiradi", "Grow=1", "Shrink=0", "Basis=100%"], correct: 1 },
        ],
      };
    }
    case "boss_fight": {
      return {
        phases: [
          { q: "Faza 1: Big-O da eng tez algoritm?", options: ["O(n²)", "O(n)", "O(log n)", "O(1)"], correct: 3 },
          { q: "Faza 2: TCP va UDP farqi?", options: ["Bir xil", "TCP ishonchli, UDP tez", "UDP ishonchli", "TCP tez"], correct: 1 },
          { q: "Faza 3: React'da state boshqarish kutubxonasi?", options: ["Redux", "Vue", "Angular", "PHP"], correct: 0 },
        ],
      };
    }
    case "deep_dive": {
      return {
        facts: [
          { text: "JavaScript ES6 da let va const qo'shildi.",          truth: true },
          { text: "MongoDB — relatsion ma'lumotlar bazasi.",             truth: false },
          { text: "React Facebook tomonidan yaratilgan.",               truth: true },
          { text: "HTTPS port 443 dan foydalanadi.",                    truth: true },
          { text: "Python interpretatorli emas, kompilyatsiya qilinadi.", truth: false },
          { text: "SQL SELECT * ni dinamik ishlab chiqarishda tavsiya etiladi.", truth: false },
        ],
      };
    }
    case "minesweeper": {
      // 4x4 grid, 6 cells with correct answers to a question, others are mines
      return {
        q: "Quyidagilardan Front-end texnologiyalarni tanlang (barchasini!):",
        options: [
          { text: "React",   safe: true },
          { text: "MySQL",   safe: false },
          { text: "Vue.js",  safe: true },
          { text: "Docker",  safe: false },
          { text: "Angular", safe: true },
          { text: "PHP",     safe: false },
          { text: "Tailwind", safe: true },
          { text: "Kafka",   safe: false },
          { text: "Svelte",  safe: true },
          { text: "MongoDB", safe: false },
          { text: "HTML",    safe: true },
          { text: "Nginx",   safe: false },
        ],
        needed: 6,
      };
    }
    case "blueprint": {
      // reorder pieces to form formula
      return {
        target: ["result", "=", "(", "a", "+", "b", ")", "*", "c"],
        shuffled: shuffle(["result", "=", "(", "a", "+", "b", ")", "*", "c"], rnd),
      };
    }
    case "pvp_arena": {
      return {
        q: "Kim tezroq javob beradi: 15 × 12 = ?",
        options: ["150", "180", "170", "195"],
        correctIndex: 1,
        opponentDelay: 8 + Math.floor(rnd() * 6), // seconds
      };
    }
    case "bug_hunter": {
      return {
        code: `function sum(arr) {\n  let total = 0;\n  for (let i = 1; i <= arr.length; i++) {\n    total += arr[i];\n  }\n  return total;\n}`,
        lines: 6,
        bugLine: 3, // off-by-one
        hint: "For sikliga diqqat qiling",
      };
    }
    case "hardcore": {
      return {
        questions: [
          { q: "1 byte = ? bit", options: ["4","8","16","32"], correct: 1 },
          { q: "Binary 1010 = ? decimal", options: ["8","10","12","16"], correct: 1 },
          { q: "TRUE OR FALSE = ?", options: ["TRUE","FALSE","NULL","undefined"], correct: 0 },
          { q: "SQL DROP TABLE nimani qiladi?", options: ["Ochadi","O'chiradi","Tuzatadi","Blocklaydi"], correct: 1 },
          { q: "OOP Encapsulation nima?", options: ["Meros","Berkitish","Polimorfizm","Abstract"], correct: 1 },
        ],
        lives: 3,
      };
    }
    case "tower_defense": {
      return {
        waves: 5,
        maxHp: 100,
        questions: [
          { q: "1 GB = ? MB", options: ["100","1000","1024","2048"], correct: 2 },
          { q: "HTTP method for delete?", options: ["POST","PATCH","DELETE","GET"], correct: 2 },
          { q: "CSS units: em vs rem", options: ["Parent","Root","Body","Grand"], correct: 1 },
          { q: "GraphQL — bu?", options: ["DB","Query lang","OS","Kernel"], correct: 1 },
          { q: "Node.js runtime?", options: ["V8","SpiderMonkey","JVM","CLR"], correct: 0 },
        ],
      };
    }
    case "evolving": {
      return {
        questions: [
          { q: "Level 1: 2+2=?",           options: ["3","4","5","6"], correct: 1, difficulty: 1 },
          { q: "Level 2: log₁₀(1000)=?",   options: ["2","3","4","10"], correct: 1, difficulty: 2 },
          { q: "Level 3: √144=?",          options: ["10","12","14","16"], correct: 1, difficulty: 3 },
          { q: "Level 4: sin(90°)=?",       options: ["0","0.5","1","√2"], correct: 2, difficulty: 4 },
          { q: "Level 5: ∫x dx=?",         options: ["x²/2 + C","x + C","ln x","cos x"], correct: 0, difficulty: 5 },
        ],
      };
    }
    case "paradox": {
      return {
        scenario: "Bir yigit shunday deydi: \"Men aytayotgan hamma gap yolg'on!\" Bu gap rost yoki yolg'on?",
        options: [
          "Rost — chunki u yolg'onchi",
          "Yolg'on — chunki u haqiqatni aytmoqda",
          "Bu Liar Paradox — mantiqiy hal qilib bo'lmaydi",
          "Ikkalasi ham bir vaqtda",
        ],
        correctIndex: 2,
      };
    }
    case "judgment": {
      return {
        case: "Sud ishi: Talaba AI yordamida ish yozdi va topshirdi. Uni jazolash kerakmi?",
        pros: [
          { text: "AI vosita — hisoblash mashinasi kabi",     valid: true },
          { text: "Talaba baribir mavzuni tushundi",           valid: true },
          { text: "Barchasi shunday qiladi",                    valid: false },
          { text: "AI bilan ishlash — kelajakning ko'nikmasi",  valid: true },
        ],
        cons: [
          { text: "Mustaqillik yo'qoladi",                      valid: true },
          { text: "Baholash adolatsiz bo'ladi",                 valid: true },
          { text: "AI faqat yomon",                             valid: false },
          { text: "Bilim tekshirilmaydi",                       valid: true },
        ],
      };
    }
  }
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Build the 15 stages with unique modes */
export function buildStages(): Stage[] {
  return ALL_MODES.map((mode, i): Stage => ({
    id: i + 1,
    title: `Bosqich ${i + 1}: ${GAME_MODE_META[mode].name}`,
    mode,
    subject: "Umumiy",
    reward: i === 14 ? 5 : i >= 10 ? 3 : 2, // last stages give more
    payload: generatePayload(mode, i * 1000 + 42),
  }));
}
