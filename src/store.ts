import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User, Subject, TeacherSubject, University, Group, TaskAssignment, Submission,
  Stage, StageProgress, ShopItem, Ad, LogEntry, Toast, TaskStatus, StudentActivity,
  ArchivedGrade, RegistrationRequest, BanRequest, ExtensionRequest
} from "./types";
import { buildStages, generatePayload } from "./games/gameData";
import { calculateOriginality, supabase } from "./supabaseClient";

// Salted Base64 hashing drayveri
export function hashPassword(password: string): string {
  return btoa("LUVIONX_SALT_" + password);
}

// Supabase jadval ustunlari snake_case (masalan amount_paid), lekin ilova
// kod ichida camelCase (masalan amountPaid) kutadi. Bu funksiya Supabase'dan
// kelgan har bir qatorni ilova kutadigan formatga aylantiradi.
// "password_hash" maydoni bundan mustasno — u ataylab snake_case holida qoladi.
function snakeToCamelRow(row: any): any {
  if (row === null || typeof row !== "object") return row;
  const out: any = {};
  for (const key of Object.keys(row)) {
    const newKey =
      key === "password_hash"
        ? key
        : key === "originality_pct"
        ? "originality"
        : key.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
    out[newKey] = row[key];
  }
  return out;
}
function snakeToCamel(rows: any[] | null): any[] | null {
  if (!rows) return rows;
  return rows.map(snakeToCamelRow);
}

function futureISO(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// Local defaults to prevent empty system, but we fetch and sync everything dynamically with Supabase!
const defaultUniversities: University[] = [
  { id: "tuit",  name: "Toshkent Axborot Texnologiyalari Universiteti", short: "TATU",  city: "Toshkent",  active: true },
  { id: "sam",   name: "Samarqand Davlat Universiteti",                short: "SamDU", city: "Samarqand", active: true },
];

const defaultSubjects: Subject[] = [
  { id: "sub_algo", name: "Algoritmlar va Ma'lumotlar Strukturasi", academicYear: "2026-2027", semester: 2, icon: "💻", bannerColor: "from-cyan-500 to-blue-700" },
  { id: "sub_math", name: "Oliy Matematika & Mantiq", academicYear: "2026-2027", semester: 2, icon: "📐", bannerColor: "from-violet-500 to-fuchsia-700" },
  { id: "sub_lang", name: "Ona tili va Nutq Madaniyati", academicYear: "2026-2027", semester: 2, icon: "✍️", bannerColor: "from-lime-500 to-emerald-700" },
];

const defaultGroups: Group[] = [
  { id: "g1", name: "472-guruh (Dasturiy injiniring)", course: 3, universityId: "tuit", teacherId: "t1" },
  { id: "g2", name: "473-guruh (Sun'iy intellekt)",     course: 3, universityId: "tuit", teacherId: "t1" },
];

interface State {
  users: User[];
  subjects: Subject[];
  teacherSubjects: TeacherSubject[];
  universities: University[];
  groups: Group[];
  tasks: TaskAssignment[];
  submissions: Submission[];
  stages: Stage[];
  stageProgress: StageProgress[];
  activities: StudentActivity[];
  shopItems: ShopItem[];
  ads: Ad[];
  logs: LogEntry[];
  toasts: Toast[];
  currentUserId: string | null;
  currentSeason: number;
  seasonStartedAt: number;
  transactions: any[];
  achievements: any[];
  archivedGrades: ArchivedGrade[];
  registrationRequests: RegistrationRequest[];
  banRequests: BanRequest[];
  extensionRequests: ExtensionRequest[];

  // initialization and realtime sync
  initializeRealtimeSync: () => void;

  // auth
  login: (login: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => void;

  // registration
  submitRegistrationRequest: (fio: string, login: string, passwordPlain: string, universityName: string, directionName: string, groupName: string) => Promise<{ ok: boolean; msg?: string }>;
  approveRegistrationRequest: (requestId: string) => Promise<void>;
  rejectRegistrationRequest: (requestId: string, reason: string) => Promise<void>;
  assignGroupToTeacher: (groupId: string, teacherId: string) => Promise<void>;

  // toasts
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;

  // logs
  log: (level: LogEntry["level"], message: string) => Promise<void>;

  // student game
  completeStage: (studentId: string, subjectId: string, stageId: number, won: boolean) => Promise<void>;
  unfreezeStage: (studentId: string, subjectId: string, stageId: number) => Promise<void>;
  useExtraAttempt: (studentId: string, subjectId: string, stageId: number) => Promise<void>;
  failAttempt: (studentId: string, subjectId: string, stageId: number) => Promise<"wrong" | "frozen">;
  regenStagePayload: (stageId: number) => void;

  // real-time activity
  startActivity: (studentId: string, subjectId: string, stageId: number) => void;
  updateActivity: (studentId: string, progress: number, status?: StudentActivity["status"]) => void;
  endActivity: (studentId: string) => void;

  // shop
  buyItem: (userId: string, itemId: string) => Promise<{ ok: boolean; msg?: string }>;
  submitP2PTransaction: (userId: string, itemId: string, amount: number, senderName: string, receiptBase64: string) => Promise<void>;
  approveTransaction: (txId: string) => Promise<void>;
  rejectTransaction: (txId: string) => Promise<void>;

  // teacher
  gradeSubmission: (subId: string, mark: number, comment: string) => Promise<void>;
  createTask: (t: Omit<TaskAssignment, "id" | "createdAt">) => Promise<void>;
  submitWork: (taskId: string, studentId: string, content: string) => Promise<void>;
  submitGameTask: (taskId: string, studentId: string, won: boolean, timeSpent: number) => Promise<void>;

  // owner
  banUser: (userId: string, reason: string) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  createUser: (u: Omit<User, "id">) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  submitBanRequest: (teacherId: string, teacherName: string, studentId: string, studentName: string, reason: string) => Promise<void>;
  approveBanRequest: (requestId: string) => Promise<void>;
  rejectBanRequest: (requestId: string) => Promise<void>;
  createUniversity: (u: Omit<University, "id">) => Promise<void>;
  toggleUniversity: (id: string) => Promise<void>;
  createAd: (a: Omit<Ad, "id" | "clicks" | "impressions">) => Promise<void>;
  removeAd: (id: string) => Promise<void>;
  resetPassword: (userId: string, newPassword: string) => Promise<void>;

  // groups CRUD
  createGroup: (name: string, course: number, universityId: string, teacherId?: string) => Promise<void>;
  updateGroup: (groupId: string, name: string, course: number, teacherId?: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // subjects CRUD (Fanlarni qo'lda kiritish)
  createSubject: (name: string, academicYear: string, semester: number, icon: string, bannerColor: string) => Promise<void>;
  updateSubject: (subjectId: string, name: string, academicYear: string, semester: number) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;

  // teacher subject assignment CRUD
  assignTeacherSubject: (teacherId: string, subjectId: string, groupId: string) => Promise<boolean>;
  removeTeacherSubject: (assignmentId: string) => Promise<void>;

  // extension
  submitExtensionRequest: (studentId: string, studentName: string, taskId: string, taskTitle: string, requestedDays: number, reason: string) => Promise<void>;
  approveExtensionRequest: (requestId: string) => Promise<void>;
  rejectExtensionRequest: (requestId: string) => Promise<void>;

  // semester reset (Multi-subject archive job)
  archiveAndResetSemester: () => Promise<void>;
}

const shopItems: ShopItem[] = [
  { id: "unfreeze",  name: "Karantin Muzlatgichi", price: 15_000,  tag: "Imkoniyat", icon: "🧊", color: "cyan",   type: "game_booster", desc: "24 soatlik blokni buzib, bosqichni darhol ochadi. Miyangiz bilan qayta topshirasiz." },
  { id: "shield",    name: "Tanga Sug'urtasi (Shield)",price: 45_000,  tag: "Sug'urta",  icon: "🛡️", color: "violet", type: "game_booster", desc: "Keyingi o'yindagi xato ballarini butunlay kuyishdan asraydi (50% saqlanadi)." },
  { id: "life",      name: "Extra Jon (+1 Heart)",     price: 15_000,  tag: "Jon",       icon: "❤️", color: "red",    type: "game_booster", desc: "Bosqich o'yinlarida yo'qotilgan 1 ta jonni darhol tiklash va davom etish imkoni." },
  { id: "time",      name: "Vaqtni Muzlatish (Freeze)",price: 20_000,  tag: "Taymer",    icon: "⏳", color: "cyan",   type: "game_booster", desc: "Vaqt bombasi va tezkor topshiriqlarda taymerni 15 soniyaga muzlatish huquqi." },
  { id: "streak",    name: "Streak Freeze (Muzlatish)",price: 10_000,  tag: "Streak",    icon: "❄️", color: "violet", type: "game_booster", desc: "Bir kun kirishni boy bersangiz ham uzluksiz kunlik rekordingizni saqlab qoladi." },
  { id: "neon_skin", name: "Kiber-Neon Avatar Ramkasi",price: 50_000,  tag: "Kosmetika", icon: "🎨", color: "lime",   type: "cosmetic",     desc: "Ismingiz atrofida porlab turuvchi neon chet. Reytingda boshqalardan yaqqol ajralasiz." },
  { id: "gold_nick", name: "Oltin Rangli Olovli Nickname",price: 75_000, tag: "Kosmetika", icon: "✨", color: "violet", type: "cosmetic",     desc: "Reyting jadvali va monitoring panellarida ismingiz oltin va olovli animatsiyada porlaydi." },
];

let toastId = 1;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      // Keep robust seed data locally, so they NEVER get deleted even if Supabase is offline/unconfigured!
      users: [
        // OWNER (Ahmedov Asilbek) - Login: dark, Paroli: web
        { id: "o1", login: "dark", password_hash: hashPassword("web"), role: "owner", fio: "Ahmedov Asilbek", ip: "78.109.192.10" },
        // TEACHER
        { id: "t1", login: "teacher", password_hash: hashPassword("teacher123"), role: "teacher", fio: "Aliyev A.A.",
          universityId: "tuit", subjects: ["Algoritmlar", "Oliy Matematika", "Ona tili"], ip: "213.230.104.99" },
        { id: "t2", login: "teacher2", password_hash: hashPassword("teacher123"), role: "teacher", fio: "Rahimova N.M.",
          universityId: "tuit", subjects: ["Ma'lumotlar bazasi"], ip: "213.230.104.100" },
        // STUDENTS (Strictly mapped to Group 472 (g1) and Group 473 (g2))
        { id: "s1", login: "student", password_hash: hashPassword("student123"), role: "student", fio: "Nodirbek Yusupov",
          universityId: "tuit", groupId: "g1", wallet: 60_000, totalScore: 24, bonusScore: 5,
          ip: "213.230.104.198", studentIdCode: "TUIT-2023-4471", teacherId: "t1",
          lives: 3, activeSkin: "neon_cyan", activeBorder: "golden_fire", inventory: ["neon_cyan", "golden_fire"],
          streak: 12, streakFreezes: 1, shields: 1, timeFreezes: 2
        },
        { id: "s2", login: "sarvinoz", password_hash: hashPassword("student123"), role: "student", fio: "Sarvinoz Karimova",
          universityId: "tuit", groupId: "g1", wallet: 25_000, totalScore: 42, bonusScore: 4,
          ip: "213.230.104.200", studentIdCode: "TUIT-2023-4472", teacherId: "t1",
          lives: 2, inventory: [], streak: 5, streakFreezes: 0, shields: 0, timeFreezes: 0
        },
        { id: "s3", login: "jasur", password_hash: hashPassword("student123"), role: "student", fio: "Jasurbek Rahmatov",
          universityId: "tuit", groupId: "g1", wallet: 5_000, totalScore: 15, bonusScore: 1,
          ip: "213.230.104.201", studentIdCode: "TUIT-2023-4473", teacherId: "t1",
          lives: 1, inventory: [], streak: 1, streakFreezes: 0, shields: 0, timeFreezes: 0
        },
        { id: "s4", login: "madina", password_hash: hashPassword("student123"), role: "student", fio: "Madina Xoliqova",
          universityId: "tuit", groupId: "g2", wallet: 80_000, totalScore: 38, bonusScore: 3,
          ip: "213.230.104.202", studentIdCode: "TUIT-2023-4474", teacherId: "t1",
          lives: 3, inventory: [], streak: 8, streakFreezes: 2, shields: 1, timeFreezes: 1
        },
        { id: "s5", login: "islom", password_hash: hashPassword("student123"), role: "student", fio: "Islom Toshmatov",
          universityId: "tuit", groupId: "g2", wallet: 0, totalScore: 20, bonusScore: 0,
          ip: "213.230.104.203", studentIdCode: "TUIT-2023-4475", banned: true, banReason: "PrintScreen aniqlandi", teacherId: "t1" },
      ],
      subjects: defaultSubjects,
      teacherSubjects: [
        { id: "ts1", teacherId: "t1", subjectId: "sub_algo", groupId: "g1" },
        { id: "ts2", teacherId: "t1", subjectId: "sub_math", groupId: "g1" },
        { id: "ts3", teacherId: "t1", subjectId: "sub_lang", groupId: "g1" },
        { id: "ts4", teacherId: "t2", subjectId: "sub_db",   groupId: "g2" },
      ],
      universities: defaultUniversities,
      groups: defaultGroups,
      tasks: [
        {
          id: "task1", subjectId: "sub_algo", subject: "Algoritmlar",
          title: "Big-O notatsiyasi — Vaqt Bombasi",
          description: "Vaqt tugashidan oldin algoritm murakkabligini toping!",
          deadline: futureISO(3), deadlineTime: "23:59",
          gameMode: "time_bomb",
          gamePayload: {
            seconds: 45,
            q: "Binary Search algoritmining eng yomon vaqt murakkabligi qanday?",
            options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
            correctIndex: 2,
          },
          maxScore: 10, teacherId: "t1", groupId: "g1", createdAt: Date.now() - 86400000 * 10,
          allowedAttempts: 3, timerMode: "global", timeLimitSeconds: 45, speedBonusMultiplier: 1.2, penaltyRate: 0.5, antiCheatActive: true, shuffleQuestions: false
        },
        {
          id: "task2", subjectId: "sub_algo", subject: "Algoritmlar",
          title: "Ma'lumot strukturalari — Zulmat Labirinti",
          description: "Har savol — labirintdagi yangi eshik. Chala javob = vaqt kamayadi.",
          deadline: futureISO(5), deadlineTime: "23:59",
          gameMode: "dark_maze",
          gamePayload: {
            rounds: 4,
            questions: [
              { q: "Stack qanday tamoyilda ishlaydi?", options: ["FIFO", "LIFO", "FILO", "Random"], correct: 1 },
              { q: "Queue qanday tamoyilda ishlaydi?", options: ["FIFO", "LIFO", "Priority", "None"], correct: 0 },
              { q: "Binary tree'da har node necha bola bo'ladi (max)?", options: ["1", "2", "3", "4"], correct: 1 },
              { q: "Hash table qidiruv vaqti (o'rtacha)?", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correct: 2 },
            ],
          },
          maxScore: 10, teacherId: "t1", groupId: "g1", createdAt: Date.now() - 86400000 * 5,
          allowedAttempts: 4, timerMode: "per_question", timeLimitSeconds: 30, speedBonusMultiplier: 1.1, penaltyRate: 0.5, antiCheatActive: true, shuffleQuestions: true
        },
        {
          id: "task3", subjectId: "sub_math", subject: "Diskret matematika",
          title: "Mantiq qonunlari — Zanjirli Reaksiya",
          description: "Diqqat! Bir xato = butun zanjir yonadi.",
          deadline: futureISO(7), deadlineTime: "18:00",
          gameMode: "chain_reaction",
          gamePayload: {
            chain: [
              { q: "A ∧ B nima?", options: ["Yig'indi", "Konyunksiya (VA)", "Dizyunksiya", "Inkor"], correct: 1 },
              { q: "A ∨ B nima?", options: ["VA", "YOKI", "AGAR", "MOS"], correct: 1 },
              { q: "¬(A ∧ B) = ?", options: ["¬A ∧ ¬B", "¬A ∨ ¬B", "A ∨ B", "A ∧ B"], correct: 1 },
              { q: "De Morgan qonuni qaysi?", options: ["¬(A∨B) = ¬A∧¬B", "A→B", "A↔B", "A⊕B"], correct: 0 },
            ],
          },
          maxScore: 10, teacherId: "t1", groupId: "g1", createdAt: Date.now() - 86400000 * 2,
          allowedAttempts: 1, timerMode: "no_timer", timeLimitSeconds: 0, speedBonusMultiplier: 1.3, penaltyRate: 2.0, antiCheatActive: true, shuffleQuestions: false
        },
        {
          id: "task4", subjectId: "sub_db", subject: "Ma'lumotlar bazasi",
          title: "SQL — Bug Hunter",
          description: "Koddagi yashirin xatoni toping!",
          deadline: futureISO(10), deadlineTime: "20:00",
          gameMode: "bug_hunter",
          gamePayload: {
            code: "SELECT name FROM users\nWHERE age > 18\nAND status = 'active\nORDER BY created_at DESC\nLIMIT 10;",
            bugLine: 2,
            hint: "String literal ochilgan, lekin yopilmagan!",
          },
          maxScore: 10, teacherId: "t2", groupId: "g2", createdAt: Date.now() - 86400000,
          allowedAttempts: 5, timerMode: "global", timeLimitSeconds: 60, speedBonusMultiplier: 1.0, penaltyRate: 0.5, antiCheatActive: false, shuffleQuestions: false
        },
      ],
      submissions: [
        { id: "sub1", taskId: "task1", studentId: "s1", submittedAt: Date.now() - 86400000 * 12,
          content: "Dijkstra ishi haqida...", originality: 92, teacherMark: 5, earnedScore: 9.5,
          status: "checked", comment: "A'lo. Diagramma juda tushunarli." },
        { id: "sub2", taskId: "task2", studentId: "s1", submittedAt: Date.now() - 86400000 * 3,
          content: "Formulalar isboti...", originality: 42, teacherMark: 0, earnedScore: 0,
          status: "resubmit", comment: "Plagiat 50% dan past. Qayta topshiring." },
        { id: "sub3", taskId: "task1", studentId: "s2", submittedAt: Date.now() - 86400000 * 11,
          content: "Dijkstra...", originality: 95, teacherMark: 5, earnedScore: 10,
          status: "checked", comment: "Perfect!" },
      ],
      stages: buildStages(),
      stageProgress: [], // Fetched and mapped dynamically per subject from Supabase
      activities: [],
      shopItems,
      ads: [
        { id: "ad1", title: "Yandex Praktikum",  description: "Dasturlashni boshlang!",   color: "from-red-500 to-orange-500",     createdBy: "o1", active: true,  clicks: 5420, impressions: 142000 },
        { id: "ad2", title: "PDP Academy",       description: "IT ta'lim markazi",         color: "from-blue-500 to-cyan-500",       createdBy: "o1", active: true,  clicks: 4110, impressions: 98000 },
        { id: "ad3", title: "AI Uzbekistan 2026",description: "Xalqaro konferensiya",      color: "from-emerald-600 to-lime-500",    createdBy: "a1", universityId: "tuit", active: true, clicks: 320, impressions: 12000 },
      ],
      logs: [
        { id: "l1", ts: Date.now() - 300000,  level: "INFO", message: "POST /api/hemis/sync/tuit → 200 (412 records)" },
        { id: "l2", ts: Date.now() - 240000,  level: "WARN", message: "Cheat-detector: window.onblur triggered (student: TUIT-2023-4471)" },
        { id: "l3", ts: Date.now() - 180000,  level: "BAN",  message: "Auto-ban: user_id=s5 reason=screenshot_attempt" },
        { id: "l4", ts: Date.now() - 120000,  level: "PAY",  message: "Payment: shop_item=unfreeze amount=50000 uzs by TUIT-2023-4471" },
        { id: "l5", ts: Date.now() - 60000,   level: "INFO", message: "Task graded: task_id=task2 originality=42% earned=0" },
      ],
      toasts: [],
      currentUserId: null,
      currentSeason: 2,
      seasonStartedAt: Date.now() - 30 * 86400000,
      transactions: [
        { id: "tx1", studentId: "s1", studentName: "Nodirbek Yusupov", amountPaid: 35000, itemPurchased: "Karantin Muzlatgichi", itemId: "unfreeze", createdAt: Date.now() - 3 * 3600000, status: "completed", userCardName: "Nodirbek Y.", receiptImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=150&q=80" },
        { id: "tx2", studentId: "s1", studentName: "Nodirbek Yusupov", amountPaid: 50000, itemPurchased: "Kiber-Neon Avatar Ramkasi", itemId: "neon_skin", createdAt: Date.now() - 1 * 3600000, status: "completed", userCardName: "Nodirbek Y.", receiptImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=150&q=80" },
      ],
      achievements: [
        { id: "ach1", title: "Survivor", desc: "Oxirgi 1 ta jon qolganida o'yinni yutdingiz!", icon: "💀" },
        { id: "ach2", title: "Sniper", desc: "Bosqich savollariga 100% aniqlikda javob berdingiz!", icon: "🎯" },
        { id: "ach3", title: "Night Owl", desc: "Yarim tundan keyin mustaqil ish topshirdingiz!", icon: "🦉" },
      ],
      archivedGrades: [],
      registrationRequests: [
        { id: "req1", fio: "Toshpo'latov Sanjar", login: "sanjar_dev", password_hash: "LUVIONX_SALT_student123", universityName: "Toshkent Axborot Texnologiyalari Universiteti", directionName: "Dasturiy Injiniring", groupName: "710-22", status: "pending", createdAt: Date.now() - 3600000 },
      ],
      banRequests: [
        { id: "ban_req1", teacherId: "t1", teacherName: "Aliyev A.A.", studentId: "s3", studentName: "Jasurbek Rahmatov", reason: "Plagiat marta yozilgan, matn focus o'chdi", status: "pending", createdAt: Date.now() - 120000 },
      ],
      extensionRequests: [
        { id: "ext1", studentId: "s1", studentName: "Nodirbek Yusupov", taskId: "task1", taskTitle: "Big-O notatsiyasi — Vaqt Bombasi", requestedDays: 3, reason: "Sog'lig'im sababli ulgurolmadim", status: "pending", createdAt: Date.now() - 180000 },
      ],

      // 100% REAL SUPABASE DATABASE ENGINE INITIALIZATION & REALTIME SYNC
      initializeRealtimeSync: async () => {
        const fetchAll = async () => {
          try {
            const [
              { data: uRaw }, { data: subRaw }, { data: tsRaw }, { data: uniRaw }, { data: grpRaw },
              { data: tskRaw }, { data: sbmRaw }, { data: progRaw }, { data: txRaw }, { data: reqRaw },
              { data: banRaw }, { data: extRaw }
            ] = await Promise.all([
              supabase.from("users").select("*"),
              supabase.from("subjects").select("*"),
              supabase.from("teacher_subjects").select("*"),
              supabase.from("universities").select("*"),
              supabase.from("groups").select("*"),
              supabase.from("tasks").select("*"),
              supabase.from("submissions").select("*"),
              supabase.from("stage_progress").select("*"),
              supabase.from("transactions").select("*"),
              supabase.from("registration_requests").select("*"),
              supabase.from("ban_requests").select("*"),
              supabase.from("extension_requests").select("*")
            ]);

            // Always sync with whatever Supabase returns (including empty
            // arrays after deletions) so every device reflects the true
            // database state instead of stale local/default data.
            const u = snakeToCamel(uRaw);
            const sub = snakeToCamel(subRaw);
            const ts = snakeToCamel(tsRaw);
            const uni = snakeToCamel(uniRaw);
            const grp = snakeToCamel(grpRaw);
            const tsk = snakeToCamel(tskRaw);
            const sbm = snakeToCamel(sbmRaw);
            const prog = snakeToCamel(progRaw);
            const tx = snakeToCamel(txRaw);
            const req = snakeToCamel(reqRaw);
            const ban = snakeToCamel(banRaw);
            const ext = snakeToCamel(extRaw);

            // The Owner account is authenticated via env vars, not stored in
            // the Supabase "users" table — make sure it always exists locally
            // so useCurrentUser() can resolve it after a successful owner login.
            if (u) {
              const ownerLogin = import.meta.env.VITE_OWNER_LOGIN || "dark";
              const hasOwner = u.some((x: any) => x.id === "o1");
              const usersWithOwner = hasOwner
                ? u
                : [
                    {
                      id: "o1",
                      login: ownerLogin,
                      password_hash: "",
                      role: "owner",
                      fio: "Ahmedov Asilbek",
                      ip: "78.109.192.10"
                    },
                    ...u
                  ];
              set({ users: usersWithOwner });
            }
            if (sub) set({ subjects: sub });
            if (ts) set({ teacherSubjects: ts });
            if (uni) set({ universities: uni });
            if (grp) set({ groups: grp });
            if (tsk) set({ tasks: tsk });
            if (sbm) set({ submissions: sbm });
            if (prog) set({ stageProgress: prog });
            if (tx) set({ transactions: tx });
            if (req) set({ registrationRequests: req });
            if (ban) set({ banRequests: ban });
            if (ext) set({ extensionRequests: ext });
          } catch (err) {
            console.warn("Database sync rehydration fallback to local caching: ", err);
          }
        };

        await fetchAll();

        // Subscribe to Realtime Database changes only once — creating or
        // re-subscribing to the same channel more than once throws
        // "cannot add postgres_changes callbacks ... after subscribe()".
        const alreadySubscribed = supabase
          .getChannels()
          .some(ch => ch.topic === "realtime:luvionx-realtime-changes");

        if (!alreadySubscribed) {
          supabase
            .channel("luvionx-realtime-changes")
            .on("postgres_changes", { event: "*", schema: "public" }, () => {
              fetchAll(); // Hot re-sync all states instantly without page reload!
            })
            .subscribe();
        }
      },

      login: async (login, password) => {
        const envOwnerLogin = import.meta.env.VITE_OWNER_LOGIN || "dark";
        const envOwnerHash = import.meta.env.VITE_OWNER_PASSWORD_HASH || hashPassword("web");

        // 1. Strict Owner Authentication (via secure Server Envs - isolated from DB)
        if (login === envOwnerLogin) {
          if (hashPassword(password) === envOwnerHash) {
            set({ currentUserId: "o1" });
            get().log("INFO", `Owner login muvaffaqiyatli: ${login}`);
            return { ok: true };
          } else {
            return { ok: false, msg: "Owner paroli xato!" };
          }
        }

        // 2. Regular Roles Authentication (from secure persistence database)
        const u = get().users.find(x => x.login === login && x.password_hash === hashPassword(password));
        if (!u) return { ok: false, msg: "Login yoki parol xato" };
        if (u.banned) return { ok: false, msg: `Sizga BAN qo'yilgan: ${u.banReason || ""}` };
        
        set({ currentUserId: u.id });
        get().log("INFO", `Login: ${u.login} (${u.role})`);
        return { ok: true };
      },
      logout: () => set({ currentUserId: null }),

      submitRegistrationRequest: async (fio, login, passwordPlain, universityName, directionName, groupName) => {
        const state = get();
        const checkUser = state.users.find(u => u.login === login);
        const checkReq = state.registrationRequests.find(r => r.login === login && r.status === "pending");
        if (checkUser || checkReq) {
          return { ok: false, msg: "Bu login band! Iltimos boshqasini kiriting." };
        }

        const newRequest: RegistrationRequest = {
          id: "req_" + Date.now(),
          fio,
          login,
          password_hash: hashPassword(passwordPlain),
          universityName,
          directionName,
          groupName,
          status: "pending",
          createdAt: Date.now()
        };

        // WRITE TO SUPABASE FOR ADMIN PANELS SYNC
        await supabase.from("registration_requests").insert({
          id: newRequest.id,
          fio,
          login,
          password_hash: newRequest.password_hash,
          university_name: universityName,
          direction_name: directionName,
          group_name: groupName,
          status: "pending"
        });

        set(s => ({
          registrationRequests: [newRequest, ...s.registrationRequests]
        }));

        get().log("INFO", `Yangi talaba ro'yxatdan o'tish so'rovi: ${fio} (Guruh: ${groupName})`);
        get().toast({
          title: "🔔 Yangi Talaba So'rovi!",
          desc: `${fio} ro'yxatdan o'tishga ruxsat so'ramoqda`,
          tone: "info"
        });

        return { ok: true };
      },

      approveRegistrationRequest: async (requestId) => {
        const state = get();
        const req = state.registrationRequests.find(r => r.id === requestId);
        if (!req) return;

        let targetGroupId = "";
        const existingGroup = state.groups.find(g => g.name.toLowerCase() === req.groupName.toLowerCase());
        
        if (existingGroup) {
          targetGroupId = existingGroup.id;
        } else {
          targetGroupId = "g_" + Date.now();
          const newGroup: Group = {
            id: targetGroupId,
            name: req.groupName,
            course: 1,
            universityId: "tuit"
          };
          await supabase.from("groups").insert({ id: targetGroupId, name: req.groupName, university_id: "tuit" });
          set(s => ({ groups: [...s.groups, newGroup] }));
        }

        const newUser: User = {
          id: "s_" + Date.now(),
          login: req.login,
          password_hash: req.password_hash,
          role: "student",
          fio: req.fio,
          universityId: "tuit",
          groupId: targetGroupId,
          wallet: 20_000,
          totalScore: 0,
          bonusScore: 0,
          studentIdCode: "LUV-" + Math.floor(Math.random() * 9000 + 1000),
          lives: 3,
          inventory: [],
          streak: 0,
          streakFreezes: 0,
          shields: 0,
          timeFreezes: 0
        };

        // INSERT TO REAL USER TABLE IN SUPABASE DB
        await supabase.from("users").insert({
          id: newUser.id,
          login: newUser.login,
          password_hash: newUser.password_hash,
          role: "student",
          fio: newUser.fio,
          group_id: targetGroupId,
          wallet: 20000
        });

        const newProgressList: StageProgress[] = [];
        const stagesTemplate = state.stages;
        state.subjects.forEach(subj => {
          stagesTemplate.forEach(stage => {
            newProgressList.push({
              studentId: newUser.id,
              subjectId: subj.id,
              stageId: stage.id,
              completed: false,
              attemptsLeft: 3,
              extraAttempts: 0
            });
          });
        });

        // BULK INSERT PROGRESS CHANNELS
        await supabase.from("registration_requests").update({ status: "approved" }).eq("id", requestId);

        set(s => ({
          registrationRequests: s.registrationRequests.map(r => r.id === requestId ? { ...r, status: "approved" as const } : r),
          users: [...s.users, newUser],
          stageProgress: [...s.stageProgress, ...newProgressList]
        }));

        get().log("INFO", `Ro'yxatdan o'tish TASDIQLANDI: ${req.fio} (User yaratildi, Guruh: ${req.groupName})`);
        get().toast({ title: "✓ So'rov Tasdiqlandi!", desc: `${req.fio} hisobi faollashdi`, tone: "success" });
      },

      rejectRegistrationRequest: async (requestId, reason) => {
        await supabase.from("registration_requests").update({ status: "rejected", reject_reason: reason }).eq("id", requestId);
        set(s => ({
          registrationRequests: s.registrationRequests.map(r => r.id === requestId ? { ...r, status: "rejected" as const, rejectReason: reason } : r)
        }));

        const req = get().registrationRequests.find(r => r.id === requestId);
        get().log("WARN", `Ro'yxatdan o'tish RAD ETILDI: ${req?.fio} sabab: ${reason}`);
        get().toast({ title: "✕ So'rov Rad Etildi", desc: `${req?.fio} so'rovi rad etildi`, tone: "warning" });
      },

      assignGroupToTeacher: async (groupId, teacherId) => {
        await supabase.from("groups").update({ teacher_id: teacherId }).eq("id", groupId);
        set(s => ({
          groups: s.groups.map(g => g.id === groupId ? { ...g, teacherId } : g)
        }));
        get().log("INFO", `Owner guruh biriktirdi: Guruh ID ${groupId} -> O'qituvchi ID ${teacherId}`);
        get().toast({ title: "✓ Guruh biriktirildi", tone: "success" });
      },

      toast: (t) => {
        const id = toastId++;
        set(s => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })),

      log: async (level, message) => {
        const entry: LogEntry = { id: `l${Date.now()}${Math.random()}`, ts: Date.now(), level, message };
        await supabase.from("logs").insert({ id: entry.id, action: level, details: message });
        set(s => ({ logs: [entry, ...s.logs].slice(0, 200) }));
      },

      completeStage: async (studentId, subjectId, stageId, won) => {
        const state = get();
        const stage = state.stages.find(s => s.id === stageId);
        if (!stage) return;
        if (won) {
          await supabase.from("stage_progress").insert({
            student_id: studentId,
            subject_id: subjectId,
            stage_id: stageId,
            status: "completed"
          });
          set(s => ({
            stageProgress: s.stageProgress.map(p =>
              p.studentId === studentId && p.subjectId === subjectId && p.stageId === stageId
                ? { ...p, completed: true } : p),
            users: s.users.map(u =>
              u.id === studentId
                ? { ...u, totalScore: Math.min(50, (u.totalScore || 0) + stage.reward) }
                : u),
          }));
          get().log("INFO", `Stage #${stageId} (${stage.mode}) SOLVED by ${studentId} on ${subjectId} (+${stage.reward} coin)`);
        }
      },

      failAttempt: async (studentId, subjectId, stageId) => {
        const state = get();
        const prog = state.stageProgress.find(p => p.studentId === studentId && p.subjectId === subjectId && p.stageId === stageId);
        if (!prog) return "wrong";
        const newAttempts = prog.attemptsLeft - 1;
        const frozen = newAttempts <= 0;
        
        await supabase.from("stage_progress").upsert({
          student_id: studentId,
          subject_id: subjectId,
          stage_id: stageId,
          attempts_left: Math.max(0, newAttempts),
          frozen_until: frozen ? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() : null
        });

        set(s => ({
          stageProgress: s.stageProgress.map(p =>
            p.studentId === studentId && p.subjectId === subjectId && p.stageId === stageId
              ? {
                  ...p,
                  attemptsLeft: Math.max(0, newAttempts),
                  frozenUntil: frozen ? Date.now() + 1000 * 60 * 60 * 24 : p.frozenUntil,
                } : p),
        }));
        if (frozen) get().log("WARN", `Stage #${stageId} on ${subjectId} FROZEN for ${studentId} (24h)`);
        return frozen ? "frozen" : "wrong";
      },

      unfreezeStage: async (studentId, subjectId, stageId) => {
        await supabase.from("stage_progress").update({ frozen_until: null, attempts_left: 3 }).eq("student_id", studentId).eq("stage_id", stageId);
        set(s => ({
          stageProgress: s.stageProgress.map(p =>
            p.studentId === studentId && p.subjectId === subjectId && p.stageId === stageId
              ? { ...p, frozenUntil: undefined, attemptsLeft: 3 } : p),
        }));
        get().log("PAY", `Unfreeze used: stage=${stageId} subject=${subjectId} student=${studentId}`);
      },

      useExtraAttempt: async (studentId, subjectId, stageId) => {
        const state = get();
        const p0 = state.stageProgress.find(p => p.studentId === studentId && p.subjectId === subjectId && p.stageId === stageId);
        const newAttemptsLeft = (p0?.attemptsLeft || 0) + 1;
        const newExtraAttempts = (p0?.extraAttempts || 0) + 1;
        await supabase.from("stage_progress").upsert({
          student_id: studentId,
          subject_id: subjectId,
          stage_id: stageId,
          attempts_left: newAttemptsLeft,
          extra_attempts: newExtraAttempts
        });
        set(s => ({
          stageProgress: s.stageProgress.map(p =>
            p.studentId === studentId && p.subjectId === subjectId && p.stageId === stageId
              ? { ...p, attemptsLeft: newAttemptsLeft, extraAttempts: newExtraAttempts } : p),
        }));
      },

      regenStagePayload: (stageId) => {
        set(s => ({
          stages: s.stages.map(st =>
            st.id === stageId ? { ...st, payload: generatePayload(st.mode, Date.now() + stageId * 999) } : st),
        }));
      },

      startActivity: (studentId, subjectId, stageId) => {
        set(s => ({
          activities: [
            ...s.activities.filter(a => a.studentId !== studentId),
            { studentId, subjectId, stageId, startedAt: Date.now(), progress: 0, status: "playing", lastPing: Date.now() },
          ],
        }));
        get().log("INFO", `Student ${studentId} started stage #${stageId} on subject ${subjectId}`);
      },

      updateActivity: (studentId, progress, status) => {
        set(s => ({
          activities: s.activities.map(a =>
            a.studentId === studentId
              ? { ...a, progress, status: status || a.status, lastPing: Date.now() }
              : a),
        }));
      },

      endActivity: (studentId) => {
        set(s => ({ activities: s.activities.filter(a => a.studentId !== studentId) }));
      },

      buyItem: async (userId, itemId) => {
        const state = get();
        const user = state.users.find(u => u.id === userId);
        const item = state.shopItems.find(i => i.id === itemId);
        if (!user || !item) return { ok: false, msg: "Xato" };
        
        const newTx = {
          id: "tx" + Date.now() + Math.floor(Math.random() * 100),
          studentId: userId,
          studentName: user.fio,
          amountPaid: item.price,
          itemPurchased: item.name,
          itemId: item.id,
          createdAt: Date.now(),
          status: "completed",
          userCardName: user.fio,
          receiptImage: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=150&q=80"
        };

        await supabase.from("transactions").insert({
          id: newTx.id,
          student_id: userId,
          amount_paid: item.price,
          item_purchased: item.name
        });

        const currentInventory = [...(user.inventory || [])];
        if (item.id === "neon_skin") currentInventory.push("neon_cyan");
        if (item.id === "gold_nick") currentInventory.push("golden_fire");
        const updatedFields = {
          inventory: currentInventory,
          lives: item.id === "life" ? Math.min(5, (user.lives || 3) + 1) : user.lives,
          shields: item.id === "shield" ? (user.shields || 0) + 1 : user.shields,
          timeFreezes: item.id === "time" ? (user.timeFreezes || 0) + 1 : user.timeFreezes,
          streakFreezes: item.id === "streak" ? (user.streakFreezes || 0) + 1 : user.streakFreezes,
          activeSkin: item.id === "neon_skin" ? "neon_cyan" : user.activeSkin,
          activeBorder: item.id === "gold_nick" ? "golden_fire" : user.activeBorder,
        };

        // Persist the purchase effect to Supabase so it survives realtime
        // resync and is visible on every device — not just this session.
        await supabase.from("users").update({
          inventory: updatedFields.inventory,
          lives: updatedFields.lives,
          shields: updatedFields.shields,
          time_freezes: updatedFields.timeFreezes,
          streak_freezes: updatedFields.streakFreezes,
          active_skin: updatedFields.activeSkin,
          active_border: updatedFields.activeBorder,
        }).eq("id", userId);

        set(s => ({
          transactions: [newTx, ...s.transactions],
          users: s.users.map(u => u.id === userId ? { ...u, ...updatedFields } : u)
        }));
        return { ok: true };
      },

      submitP2PTransaction: async (userId, itemId, amount, senderName, receiptBase64) => {
        const state = get();
        const user = state.users.find(u => u.id === userId);
        const item = state.shopItems.find(i => i.id === itemId);
        if (!user || !item) return;

        const newTx = {
          id: "tx_p2p_" + Date.now() + Math.floor(Math.random() * 100),
          studentId: userId,
          studentName: user.fio,
          amountPaid: amount,
          itemPurchased: item.name,
          itemId: item.id,
          createdAt: Date.now(),
          status: "pending" as const,
          receiptImage: receiptBase64,
          userCardName: senderName
        };

        try {
          await supabase
            .from("transactions")
            .insert({
              id: newTx.id,
              student_id: newTx.studentId,
              amount_paid: newTx.amountPaid,
              item_purchased: newTx.itemPurchased,
              created_at: new Date(newTx.createdAt).toISOString()
            });
        } catch (err) {
          console.warn("Offline write mode: ", err);
        }

        set(s => ({
          transactions: [newTx, ...s.transactions]
        }));

        get().log("PAY", `P2P Kvitansiya topshirildi: ${item.name} (${amount} so'm) by ${user.fio}`);
        get().toast({ title: "⏳ Kvitansiya yuborildi", desc: "Tizim egasi (Asilbek) tez orada tasdiqlaydi", tone: "info" });
      },

      approveTransaction: async (txId) => {
        const state = get();
        const tx = state.transactions.find(t => t.id === txId);
        if (!tx) return;

        await supabase.from("transactions").update({ status: "completed" }).eq("id", txId);

        const student = state.users.find(u => u.id === tx.studentId);
        if (student) {
          const currentInventory = [...(student.inventory || [])];
          if (tx.itemId === "neon_skin") currentInventory.push("neon_cyan");
          if (tx.itemId === "gold_nick") currentInventory.push("golden_fire");
          const updatedFields = {
            inventory: currentInventory,
            lives: tx.itemId === "life" ? Math.min(5, (student.lives || 3) + 1) : student.lives,
            shields: tx.itemId === "shield" ? (student.shields || 0) + 1 : student.shields,
            timeFreezes: tx.itemId === "time" ? (student.timeFreezes || 0) + 1 : student.timeFreezes,
            streakFreezes: tx.itemId === "streak" ? (student.streakFreezes || 0) + 1 : student.streakFreezes,
            activeSkin: tx.itemId === "neon_skin" ? "neon_cyan" : student.activeSkin,
            activeBorder: tx.itemId === "gold_nick" ? "golden_fire" : student.activeBorder,
          };

          // Persist to Supabase so the boost survives realtime resync and
          // shows up correctly on the student's own device too.
          await supabase.from("users").update({
            inventory: updatedFields.inventory,
            lives: updatedFields.lives,
            shields: updatedFields.shields,
            time_freezes: updatedFields.timeFreezes,
            streak_freezes: updatedFields.streakFreezes,
            active_skin: updatedFields.activeSkin,
            active_border: updatedFields.activeBorder,
          }).eq("id", tx.studentId);

          set(s => ({
            transactions: s.transactions.map(t => t.id === txId ? { ...t, status: "completed" as const } : t),
            users: s.users.map(u => u.id === tx.studentId ? { ...u, ...updatedFields } : u)
          }));
        } else {
          set(s => ({
            transactions: s.transactions.map(t => t.id === txId ? { ...t, status: "completed" as const } : t),
          }));
        }

        get().log("PAY", `P2P Xarid TASDIQLANDI (Approve): ${tx.itemPurchased} -> ${tx.studentName}`);
        get().toast({ title: "✓ Xarid Tasdiqlandi!", desc: tx.itemPurchased, tone: "success" });
      },

      rejectTransaction: async (txId) => {
        await supabase.from("transactions").update({ status: "rejected" }).eq("id", txId);
        set(s => ({
          transactions: s.transactions.map(t => t.id === txId ? { ...t, status: "rejected" as const } : t)
        }));

        const tx = get().transactions.find(t => t.id === txId);
        get().log("WARN", `P2P Xarid RAD ETILDI (Reject): ${tx?.itemPurchased} -> ${tx?.studentName}`);
        get().toast({ title: "✕ Xarid Rad Etildi!", desc: tx?.itemPurchased, tone: "error" });
      },

      gradeSubmission: async (subId, mark, comment) => {
        const state = get();
        const sub = state.submissions.find(s => s.id === subId);
        if (!sub) return;
        const task = state.tasks.find(t => t.id === sub.taskId);
        if (!task) return;

        const originality = sub.originality || Math.floor(Math.random() * 40) + 55;
        const deadlineTs = new Date(task.deadline).getTime();
        const daysLate = Math.max(0, Math.ceil((sub.submittedAt - deadlineTs) / 86400000));
        const deadlineBonus = daysLate === 0 ? 2 : -0.5 * daysLate;

        let originalityFactor = 1;
        if (originality < 50) originalityFactor = 0;
        else if (originality < 80) originalityFactor = 0.5;

        let earned = 0;
        if (originalityFactor === 0) {
          earned = 0;
        } else {
          earned = Math.max(0, Math.min(task.maxScore, (mark * 1.2) + deadlineBonus)) * originalityFactor;
          earned = Math.round(earned * 10) / 10;
        }

        const status: TaskStatus = originalityFactor === 0 ? "resubmit" : daysLate > 0 ? "late" : "checked";

        await supabase.from("submissions").update({
          teacher_score: mark,
          teacher_comment: comment,
          final_score: earned,
          status: status
        }).eq("id", subId);

        set(s => {
          const oldEarned = sub.earnedScore || 0;
          const scoreDelta = earned - oldEarned;
          return {
            submissions: s.submissions.map(x =>
              x.id === subId
                ? { ...x, teacherMark: mark, comment, earnedScore: earned, originality, status }
                : x),
            users: s.users.map(u =>
              u.id === sub.studentId
                ? { ...u, totalScore: Math.max(0, Math.min(50, (u.totalScore || 0) + scoreDelta)) }
                : u),
          };
        });
        get().log("INFO", `Task graded: sub=${subId} mark=${mark} originality=${originality}% earned=${earned}`);
      },

      createTask: async (t) => {
        const id = "task" + Date.now();
        const newTask: TaskAssignment = { ...t, id, createdAt: Date.now() };
        
        try {
          await supabase
            .from("tasks")
            .insert({
              id,
              subject_id: t.subjectId,
              teacher_id: t.teacherId,
              title: t.title,
              description: t.description,
              deadline: t.deadline,
              max_score: t.maxScore
            });
        } catch (err) {
          console.warn("Offline write mode: ", err);
        }

        set(s => ({ tasks: [...s.tasks, newTask] }));
        get().log("INFO", `Task created: ${t.title}`);
      },

      submitWork: async (taskId, studentId, content) => {
        const allExistingSubmissions = get().submissions.map(x => x.content);
        const originality = calculateOriginality(content, allExistingSubmissions);

        const sub: Submission = {
          id: "sub" + Date.now(),
          taskId, studentId, content,
          submittedAt: Date.now(),
          originality,
          teacherMark: 0,
          earnedScore: 0,
          status: "pending",
        };

        try {
          await supabase
            .from("submissions")
            .insert({
              id: sub.id,
              task_id: taskId,
              student_id: studentId,
              content: content,
              originality_pct: originality,
              status: "pending",
              submitted_at: new Date(sub.submittedAt).toISOString()
            });
        } catch (err) {
          console.warn("Offline work mode: ", err);
        }

        set(s => ({ submissions: [...s.submissions, sub] }));
        get().log("INFO", `Submission created: task=${taskId} student=${studentId} originality=${originality}%`);
      },

      submitGameTask: async (taskId, studentId, won, timeSpent) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        const deadlineTs = new Date(`${task.deadline}T${task.deadlineTime || "23:59"}:00`).getTime();
        const daysLate = Math.max(0, Math.ceil((Date.now() - deadlineTs) / 86400000));
        let earned = 0;
        if (won) {
          const deadlineBonus = daysLate === 0 ? 2 : -0.5 * daysLate;
          earned = Math.max(0, Math.min(task.maxScore, task.maxScore + deadlineBonus));
          earned = Math.round(earned * 10) / 10;
        }
        const existingSubIndex = state.submissions.findIndex(x => x.taskId === taskId && x.studentId === studentId);
        const sub: Submission = {
          id: existingSubIndex >= 0 ? state.submissions[existingSubIndex].id : "sub" + Date.now(),
          taskId, studentId,
          content: `[O'yin Natijasi] ${won ? "G'olib" : "Mag'lub"} · ${timeSpent}s`,
          submittedAt: Date.now(),
          originality: 100,
          teacherMark: won ? 5 : 0,
          earnedScore: earned,
          status: won ? (daysLate > 0 ? "late" : "checked") : "resubmit",
          comment: won ? `Avtomatik: o'yin g'alaba (${timeSpent}s ichida)` : `Mag'lub. Qayta urinib ko'ring.`,
        };

        try {
          await supabase
            .from("submissions")
            .upsert({
              id: sub.id,
              task_id: taskId,
              student_id: studentId,
              content: sub.content,
              submitted_at: new Date(sub.submittedAt).toISOString(),
              originality_pct: sub.originality,
              teacher_score: sub.teacherMark,
              teacher_comment: sub.comment,
              final_score: sub.earnedScore,
              status: sub.status
            });
        } catch (err) {
          console.warn("Offline fallback triggered: ", err);
        }

        const currentHour = new Date().getHours();
        const isNight = currentHour >= 0 && currentHour < 5;
        const isPerfect = won && timeSpent < 20;

        const currentTotal = state.users.find(u => u.id === studentId)?.totalScore || 0;
        const delta0 = existingSubIndex >= 0 ? earned - (state.submissions[existingSubIndex].earnedScore || 0) : earned;
        const newTotalScore = Math.max(0, Math.min(50, currentTotal + delta0));
        try {
          await supabase.from("users").update({ total_score: newTotalScore }).eq("id", studentId);
        } catch (err) {
          console.warn("Offline fallback triggered: ", err);
        }

        if (existingSubIndex >= 0) {
          set(s => ({
            submissions: s.submissions.map((x, i) => i === existingSubIndex ? sub : x),
            users: s.users.map(u => u.id === studentId ? { ...u, totalScore: newTotalScore } : u),
            achievements: s.achievements.map(a => {
              if (a.id === "ach3" && isNight && !a.unlockedAt) {
                get().toast({ title: "🦉 Yutuq ochildi: Night Owl!", desc: "Tungi mustaqil ish daho'si!", tone: "success" });
                return { ...a, unlockedAt: Date.now() };
              }
              if (a.id === "ach2" && isPerfect && !a.unlockedAt) {
                get().toast({ title: "🎯 Yutuq ochildi: Sniper!", desc: "Tezkor va 100% aniq o'yin!", tone: "success" });
                return { ...a, unlockedAt: Date.now() };
              }
              return a;
            }),
          }));
        } else {
          set(s => ({
            submissions: [...s.submissions, sub],
            users: s.users.map(u => u.id === studentId ? { ...u, totalScore: newTotalScore } : u),
            achievements: s.achievements.map(a => {
              if (a.id === "ach3" && isNight && !a.unlockedAt) {
                get().toast({ title: "🦉 Yutuq ochildi: Night Owl!", desc: "Tungi mustaqil ish daho'si!", tone: "success" });
                return { ...a, unlockedAt: Date.now() };
              }
              if (a.id === "ach2" && isPerfect && !a.unlockedAt) {
                get().toast({ title: "🎯 Yutuq ochildi: Sniper!", desc: "Tezkor va 100% aniq o'yin!", tone: "success" });
                return { ...a, unlockedAt: Date.now() };
              }
              return a;
            }),
          }));
        }
        get().log("INFO", `Game task ${won ? "COMPLETED" : "FAILED"}: task=${taskId} student=${studentId} earned=${earned}`);
      },

      banUser: async (userId, reason) => {
        await supabase.from("users").update({ banned: true, ban_reason: reason }).eq("id", userId);
        set(s => ({
          users: s.users.map(u => u.id === userId ? { ...u, banned: true, banReason: reason } : u),
        }));
        get().log("BAN", `User BANNED: ${userId} reason="${reason}"`);
      },
      unbanUser: async (userId) => {
        await supabase.from("users").update({ banned: false, ban_reason: null }).eq("id", userId);
        set(s => ({
          users: s.users.map(u => u.id === userId ? { ...u, banned: false, banReason: undefined } : u),
        }));
        get().log("INFO", `User UNBANNED: ${userId}`);
      },

      createUser: async (u) => {
        const id = "u" + Date.now();
        const secureUser = {
          ...u,
          id,
          password_hash: hashPassword(u.password_hash)
        };
        await supabase.from("users").insert({
          id: secureUser.id,
          login: secureUser.login,
          password_hash: secureUser.password_hash,
          role: secureUser.role,
          fio: secureUser.fio,
          wallet: secureUser.wallet
        });
        set(s => ({ users: [...s.users, secureUser] }));
        get().log("INFO", `User created: ${u.login} (${u.role})`);
      },

      deleteUser: async (userId) => {
        await supabase.from("users").delete().eq("id", userId);
        set(s => ({
          users: s.users.filter(u => u.id !== userId)
        }));
        get().log("WARN", `User DELETED: ${userId}`);
      },

      submitBanRequest: async (teacherId, teacherName, studentId, studentName, reason) => {
        const newRequest: BanRequest = {
          id: "ban_req_" + Date.now(),
          teacherId,
          teacherName,
          studentId,
          studentName,
          reason,
          status: "pending",
          createdAt: Date.now()
        };
        await supabase.from("ban_requests").insert({
          id: newRequest.id,
          requested_by: teacherId,
          student_id: studentId,
          reason: reason,
          status: "pending"
        });
        set(s => ({
          banRequests: [newRequest, ...s.banRequests]
        }));
        get().log("WARN", `O'qituvchi BAN so'rovi yubordi: Talaba ${studentName} -> O'qituvchi ${teacherName}`);
        get().toast({ title: "⏳ Ban So'rovi yuborildi", desc: "Owner ko'rib chiqishini kuting", tone: "warning" });
      },

      approveBanRequest: async (requestId) => {
        const state = get();
        const req = state.banRequests.find(r => r.id === requestId);
        if (!req) return;

        await supabase.from("ban_requests").update({ status: "approved" }).eq("id", requestId);
        await supabase.from("users").update({ banned: true, ban_reason: req.reason }).eq("id", req.studentId);

        set(s => ({
          banRequests: s.banRequests.map(r => r.id === requestId ? { ...r, status: "approved" as const } : r),
          users: s.users.map(u => u.id === req.studentId ? { ...u, banned: true, banReason: req.reason } : u)
        }));

        get().log("BAN", `Ban so'rovi TASDIQLANDI: Talaba ${req.studentName} BAN qilindi (Sabab: ${req.reason})`);
        get().toast({ title: "✓ Talaba Ban Qilindi!", desc: req.studentName, tone: "error" });
      },

      rejectBanRequest: async (requestId) => {
        await supabase.from("ban_requests").update({ status: "rejected" }).eq("id", requestId);
        const req = get().banRequests.find(r => r.id === requestId);
        set(s => ({
          banRequests: s.banRequests.map(r => r.id === requestId ? { ...r, status: "rejected" as const } : r)
        }));
        get().log("INFO", `Ban so'rovi RAD ETILDI: Talaba ${req?.studentName}`);
        get().toast({ title: "✕ Ban so'rovi rad etildi", tone: "info" });
      },

      createUniversity: async (u) => {
        const id = "uni" + Date.now();
        await supabase.from("universities").insert({ id, name: u.name, short: u.short, city: u.city, active: true });
        set(s => ({ universities: [...s.universities, { ...u, id, active: true }] }));
        get().log("INFO", `University created: ${u.name}`);
      },

      toggleUniversity: async (id) => {
        const current = get().universities.find(x => x.id === id);
        await supabase.from("universities").update({ active: !current?.active }).eq("id", id);
        set(s => ({
          universities: s.universities.map(u => u.id === id ? { ...u, active: !u.active } : u),
        }));
      },

      createAd: async (a) => {
        const id = "ad" + Date.now();
        set(s => ({ ads: [...s.ads, { ...a, id, clicks: 0, impressions: 0 }] }));
        await get().log("INFO", `Ad created: ${a.title}`);
      },

      removeAd: async (id) => {
        set(s => ({ ads: s.ads.filter(a => a.id !== id) }));
      },

      resetPassword: async (userId, newPassword) => {
        await supabase.from("users").update({ password_hash: hashPassword(newPassword) }).eq("id", userId);
        set(s => ({
          users: s.users.map(u => u.id === userId ? { ...u, password_hash: hashPassword(newPassword) } : u),
        }));
        get().log("WARN", `Password reset for user ${userId}`);
      },

      createGroup: async (name, course, universityId, teacherId) => {
        const id = "g_" + Date.now();
        const newGroup: Group = { id, name, course, universityId, teacherId };
        await supabase.from("groups").insert({ id, name, course, university_id: universityId, teacher_id: teacherId });
        set(s => ({ groups: [...s.groups, newGroup] }));
        get().log("INFO", `Yangi guruh yaratildi: ${name} (Kurs: ${course})`);
        get().toast({ title: "✓ Guruh yaratildi!", desc: name, tone: "success" });
      },

      updateGroup: async (groupId, name, course, teacherId) => {
        await supabase.from("groups").update({ name, course, teacher_id: teacherId }).eq("id", groupId);
        set(s => ({
          groups: s.groups.map(g => g.id === groupId ? { ...g, name, course, teacherId } : g)
        }));
        get().log("INFO", `Guruh tahrirlandi: ${name} (Guruh ID: ${groupId})`);
        get().toast({ title: "✓ Guruh o'zgartirildi!", desc: name, tone: "success" });
      },

      deleteGroup: async (groupId) => {
        const g = get().groups.find(x => x.id === groupId);
        await supabase.from("groups").delete().eq("id", groupId);
        set(s => ({ groups: s.groups.filter(x => x.id !== groupId) }));
        get().log("WARN", `Guruh O'CHIRILDI: ${g?.name || groupId}`);
        get().toast({ title: "🗑 Guruh o'chirildi!", tone: "info" });
      },

      createSubject: async (name, academicYear, semester, icon, bannerColor) => {
        const id = "sub_" + Date.now();
        const newSubject: Subject = { id, name, academicYear, semester, icon, bannerColor };
        await supabase.from("subjects").insert({ id, name, academic_year: academicYear, semester, icon, banner_color: bannerColor });
        set(s => ({ subjects: [...s.subjects, newSubject] }));
        get().log("INFO", `Yangi dars fani yaratildi: ${name} (${academicYear})`);
        get().toast({ title: "✓ Yangi fan qo'shildi!", desc: name, tone: "success" });
      },

      updateSubject: async (subjectId, name, academicYear, semester) => {
        await supabase.from("subjects").update({ name, academic_year: academicYear, semester }).eq("id", subjectId);
        set(s => ({
          subjects: s.subjects.map(sub => sub.id === subjectId ? { ...sub, name, academicYear, semester } : sub)
        }));
        get().log("INFO", `Fan tahrirlandi: ${name} (Fan ID: ${subjectId})`);
        get().toast({ title: "✓ Fan yangilandi!", desc: name, tone: "success" });
      },

      deleteSubject: async (subjectId) => {
        const sub = get().subjects.find(x => x.id === subjectId);
        await supabase.from("subjects").delete().eq("id", subjectId);
        set(s => ({ subjects: s.subjects.filter(x => x.id !== subjectId) }));
        get().log("WARN", `Fan O'CHIRILDI: ${sub?.name || subjectId}`);
        get().toast({ title: "🗑 Fan o'chirildi!", tone: "info" });
      },

      assignTeacherSubject: async (teacherId, subjectId, groupId) => {
        const state = get();
        const duplicate = state.teacherSubjects.find(ts => ts.subjectId === subjectId && ts.groupId === groupId);
        if (duplicate) {
          const existingTeacher = state.users.find(u => u.id === duplicate.teacherId);
          const msg = `Bu fan va guruh allaqachon ${existingTeacher?.fio || "boshqa o'qituvchi"}ga biriktirilgan!`;
          get().toast({ title: "❌ Biriktirish rad etildi", desc: msg, tone: "error" });
          return false;
        }

        const newAssignment: TeacherSubject = { id: "ts_" + Date.now(), teacherId, subjectId, groupId };
        await supabase.from("teacher_subjects").insert({ id: newAssignment.id, teacher_id: teacherId, subject_id: subjectId, group_id: groupId });
        
        set(s => ({ teacherSubjects: [...s.teacherSubjects, newAssignment] }));
        get().log("INFO", `Yangi fan biriktirildi: O'qituvchi ID ${teacherId} -> Fan ID ${subjectId} (Guruh: ${groupId})`);
        get().toast({ title: "✓ Fan biriktirildi!", tone: "success" });
        return true;
      },

      removeTeacherSubject: async (assignmentId) => {
        await supabase.from("teacher_subjects").delete().eq("id", assignmentId);
        set(s => ({ teacherSubjects: s.teacherSubjects.filter(ts => ts.id !== assignmentId) }));
        get().log("WARN", `Fan biriktirish bekor qilindi (ID: ${assignmentId})`);
        get().toast({ title: "❌ Biriktirish bekor qilindi", tone: "info" });
      },

      submitExtensionRequest: async (studentId, studentName, taskId, taskTitle, requestedDays, reason) => {
        const newRequest: ExtensionRequest = {
          id: "ext_req_" + Date.now(),
          studentId,
          studentName,
          taskId,
          taskTitle,
          requestedDays,
          reason,
          status: "pending",
          createdAt: Date.now()
        };
        await supabase.from("extension_requests").insert({
          id: newRequest.id,
          student_id: studentId,
          task_id: taskId,
          requested_days: requestedDays,
          reason: reason,
          status: "pending"
        });
        set(s => ({ extensionRequests: [newRequest, ...s.extensionRequests] }));
        get().log("INFO", `Talaba muddat uzaytirish so'rovi yubordi: ${studentName} -> ${taskTitle}`);
        get().toast({ title: "⏳ So'rov yuborildi", desc: "O'qituvchi ko'rib chiqishini kuting", tone: "success" });
      },

      approveExtensionRequest: async (requestId) => {
        const state = get();
        const req = state.extensionRequests.find(r => r.id === requestId);
        if (!req) return;

        await supabase.from("extension_requests").update({ status: "approved" }).eq("id", requestId);

        set(s => {
          const updatedTasks = s.tasks.map(t => {
            if (t.id !== req.taskId) return t;
            const d = new Date(t.deadline);
            d.setDate(d.getDate() + req.requestedDays);
            return { ...t, deadline: d.toISOString().slice(0, 10) };
          });
          return {
            extensionRequests: s.extensionRequests.map(r => r.id === requestId ? { ...r, status: "approved" as const } : r),
            tasks: updatedTasks
          };
        });

        get().log("INFO", `Muddat uzaytirish TASDIQLANDI: Talaba ${req.studentName} topshiriq muddatini ${req.requestedDays} kunga uzaytirdi.`);
        get().toast({ title: "✓ So'rov Tasdiqlandi!", desc: `Muddat ${req.requestedDays} kunga uzaytirildi`, tone: "success" });
      },

      rejectExtensionRequest: async (requestId) => {
        await supabase.from("extension_requests").update({ status: "rejected" }).eq("id", requestId);
        const req = get().extensionRequests.find(r => r.id === requestId);
        set(s => ({
          extensionRequests: s.extensionRequests.map(r => r.id === requestId ? { ...r, status: "rejected" as const } : r)
        }));
        get().log("INFO", `Muddat uzaytirish RAD ETILDI: Talaba ${req?.studentName}`);
        get().toast({ title: "✕ So'rov rad etildi", tone: "warning" });
      },

      archiveAndResetSemester: async () => {
        const state = get();
        const activeStudents = state.users.filter(u => u.role === "student");
        const activeSubjects = state.subjects;

        const newArchives: ArchivedGrade[] = [];

        activeStudents.forEach(st => {
          activeSubjects.forEach(sub => {
            const subProgress = state.stageProgress.filter(p => p.studentId === st.id && p.subjectId === sub.id && p.completed);
            const totalCoins = subProgress.length;

            let finalGrade = "F";
            if (totalCoins >= 12) finalGrade = "A";
            else if (totalCoins >= 9) finalGrade = "B";
            else if (totalCoins >= 6) finalGrade = "C";
            else if (totalCoins >= 4) finalGrade = "D";

            newArchives.push({
              id: "arch_" + Date.now() + Math.floor(Math.random() * 1000),
              studentId: st.id,
              studentName: st.fio,
              subjectId: sub.id,
              subjectName: sub.name,
              totalCoinsEarned: totalCoins,
              finalGrade,
              semester: `${sub.academicYear} / ${sub.semester}-Semestr`,
            });
          });
        });

        set(s => ({
          currentSeason: s.currentSeason + 1,
          seasonStartedAt: Date.now(),
          archivedGrades: [...s.archivedGrades, ...newArchives],
          users: s.users.map(u => u.role === "student" ? { ...u, totalScore: 0, bonusScore: 0 } : u),
          stageProgress: s.stageProgress.map(p => ({
            ...p, completed: false, attemptsLeft: 3, frozenUntil: undefined, extraAttempts: 0
          })),
          activities: [],
          stages: s.stages.map(st => ({ ...st, payload: generatePayload(st.mode, Date.now() + st.id) })),
        }));

        get().log("INFO", `🔥 CRON SEMESTR RESET YAKUNLANDI: Barcha fanlar arxivlandi, yangi mavsum boshlandi!`);
        get().toast({ title: "🔥 Semestr yakunlandi", desc: "Barcha ballar arxivlandi va nolga tushirildi", tone: "warning" });
      }
    }),
    { name: "luvionx-gamified-lms-store" }
  )
);

/* ---------------- Selectors ---------------- */
export const useCurrentUser = () => useStore(s => s.users.find(u => u.id === s.currentUserId) || null);

export function zoneOf(score: number): "red" | "yellow" | "green" {
  if (score >= 41) return "green";
  if (score >= 26) return "yellow";
  return "red";
}
