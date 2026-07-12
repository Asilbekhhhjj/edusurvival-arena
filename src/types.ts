export type Role = "owner" | "teacher" | "student";
export type Zone = "red" | "yellow" | "green";
export type TaskStatus = "checked" | "pending" | "late" | "resubmit" | "draft";

export interface User {
  id: string;
  login: string;
  password_hash: string; // Real hashed password using BCRYPT
  role: Role;
  fio: string;
  universityId?: string;
  groupId?: string;
  subjects?: string[];
  banned?: boolean;
  banReason?: string;
  wallet?: number; // so'm (shared)
  totalScore?: number; // student general score placeholder
  bonusScore?: number; // shared
  ip?: string;
  onlineSince?: number;
  studentIdCode?: string;
  teacherId?: string; // Which teacher added this student (for security and strict control)
  // Shared Fair monetization items
  lives?: number; 
  activeSkin?: string; 
  activeBorder?: string; 
  inventory?: string[]; 
  streak?: number; 
  streakFreezes?: number; 
  shields?: number; 
  timeFreezes?: number; 
}

export interface Subject {
  id: string;
  name: string;
  academicYear: string;
  semester: number;
  icon: string;
  bannerColor: string;
}

export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  groupId: string;
}

export interface University {
  id: string;
  name: string;
  short: string;
  city: string;
  active: boolean;
}

export interface Group {
  id: string;
  name: string;
  course: number;
  universityId: string;
  teacherId?: string;
}

export interface TaskAssignment {
  id: string;
  subjectId: string; // Linked to subjects table
  subject: string; // subject display name
  title: string;
  description: string;
  deadline: string; // ISO date
  deadlineTime?: string; // "HH:MM"
  gameMode: GameMode;
  gamePayload: any; 
  maxScore: number;
  teacherId: string;
  groupId: string;
  createdAt: number;
  allowedAttempts: number; 
  timerMode: "global" | "per_question" | "no_timer";
  timeLimitSeconds: number;
  speedBonusMultiplier: number; 
  penaltyRate: number; 
  antiCheatActive: boolean;
  prerequisiteTaskId?: string; 
  shuffleQuestions: boolean;
}

export interface Submission {
  id: string;
  taskId: string;
  studentId: string;
  submittedAt: number;
  content: string;
  originality: number; 
  teacherMark: number; 
  earnedScore: number;
  status: TaskStatus;
  comment?: string;
  hasSafeGuard?: boolean;
}

export type GameMode =
  | "dark_maze" | "time_bomb" | "crypto_breaker" | "chain_reaction" | "boss_fight"
  | "deep_dive" | "minesweeper" | "blueprint" | "pvp_arena" | "bug_hunter"
  | "hardcore" | "tower_defense" | "evolving" | "paradox" | "judgment";

export interface Stage {
  id: number;
  title: string;
  mode: GameMode;
  reward: number;
  subject: string;
  deadline?: number; 
  payload: any; 
}

export interface StudentActivity {
  studentId: string;
  subjectId: string; 
  stageId: number;
  startedAt: number;
  progress: number; 
  status: "playing" | "won" | "lost" | "idle";
  lastPing: number;
}

export interface StageProgress {
  studentId: string;
  subjectId: string; 
  stageId: number;
  completed: boolean;
  attemptsLeft: number;
  frozenUntil?: number;
  extraAttempts: number;
}

export type ShopItemType = "game_booster" | "cosmetic";

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  tag: string;
  desc: string;
  color: "cyan" | "violet" | "lime" | "red";
  icon: string;
  type: ShopItemType;
  effectValue?: any;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  color: string;
  createdBy: string; 
  universityId?: string; 
  active: boolean;
  clicks: number;
  impressions: number;
}

export interface LogEntry {
  id: string;
  ts: number;
  level: "INFO" | "WARN" | "BAN" | "ERROR" | "PAY";
  message: string;
}

export interface Toast {
  id: number;
  title: string;
  desc?: string;
  tone: "success" | "error" | "info" | "warning";
}

export interface ArchivedGrade {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  totalCoinsEarned: number;
  finalGrade: string; 
  semester: string;
}

export interface RegistrationRequest {
  id: string;
  fio: string;
  login: string;
  password_hash: string;
  universityName: string; // Qo'lda kiritiladigan universitet nomi
  directionName: string;  // Qo'lda kiritiladigan yo'nalish nomi
  groupName: string;      // Qo'lda kiritiladigan guruh nomi
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  createdAt: number;
}

export interface BanRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface ExtensionRequest {
  id: string;
  studentId: string;
  studentName: string;
  taskId: string;
  taskTitle: string;
  requestedDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}
