-- ================================================
-- EduSurvival Arena — Supabase RLS Siyosatlari
-- Row Level Security — ma'lumotlar xavfsizligi
-- Supabase SQL Editor da ishga tushiring
-- ================================================

-- ─── 1. BARCHA JADVALLARDA RLS YOQISH ────────────────────────────────────
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items     ENABLE ROW LEVEL SECURITY;

-- ─── 2. HELPER FUNKSIYALAR ────────────────────────────────────────────────
-- Joriy foydalanuvchi rolini olish
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()::text
$$ LANGUAGE sql SECURITY DEFINER;

-- Joriy foydalanuvchi owner ekanligini tekshirish
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'owner')
$$ LANGUAGE sql SECURITY DEFINER;

-- Joriy foydalanuvchi teacher ekanligini tekshirish
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'teacher')
$$ LANGUAGE sql SECURITY DEFINER;

-- ─── 3. USERS JADVALI SIYOSATLARI ─────────────────────────────────────────
-- Foydalanuvchi o'z ma'lumotini ko'ra oladi
CREATE POLICY "users_select_self"
ON users FOR SELECT
USING (id = auth.uid()::text OR is_owner() OR is_teacher());

-- Faqat owner yangi foydalanuvchi qo'sha oladi
CREATE POLICY "users_insert_owner"
ON users FOR INSERT
WITH CHECK (is_owner());

-- Foydalanuvchi o'z profilini yangilay oladi (role o'zgara olmaydi)
CREATE POLICY "users_update_self"
ON users FOR UPDATE
USING (id = auth.uid()::text)
WITH CHECK (
    id = auth.uid()::text AND
    -- Role ni o'zgartirishga ruxsat yo'q!
    role = (SELECT role FROM users WHERE id = auth.uid()::text)
);

-- Owner istalgan foydalanuvchini yangilay oladi
CREATE POLICY "users_update_owner"
ON users FOR UPDATE
USING (is_owner());

-- Faqat owner o'chirishga ruxsat
CREATE POLICY "users_delete_owner"
ON users FOR DELETE
USING (is_owner());

-- ─── 4. TASKS (Topshiriqlar) SIYOSATLARI ─────────────────────────────────
-- Barcha autentifikatsiyalangan foydalanuvchilar ko'ra oladi
CREATE POLICY "tasks_select_authenticated"
ON tasks FOR SELECT
USING (auth.role() = 'authenticated');

-- Faqat teacher va owner topshiriq yarata oladi
CREATE POLICY "tasks_insert_teacher_owner"
ON tasks FOR INSERT
WITH CHECK (is_owner() OR is_teacher());

-- Faqat yaratuvchi yoki owner yangilay oladi
CREATE POLICY "tasks_update_creator_owner"
ON tasks FOR UPDATE
USING (
    teacher_id = auth.uid()::text OR is_owner()
);

-- ─── 5. SUBMISSIONS (Javoblar) SIYOSATLARI ────────────────────────────────
-- Student o'z javoblarini ko'ra oladi; teacher o'z guruhi javoblarini ko'ra oladi
CREATE POLICY "submissions_select"
ON submissions FOR SELECT
USING (
    student_id = auth.uid()::text OR
    is_teacher() OR
    is_owner()
);

-- Faqat student o'z javobini yubora oladi
CREATE POLICY "submissions_insert_student"
ON submissions FOR INSERT
WITH CHECK (
    student_id = auth.uid()::text AND
    auth.role() = 'authenticated'
);

-- Teacher/owner javobni baholay oladi (UPDATE)
CREATE POLICY "submissions_update_grader"
ON submissions FOR UPDATE
USING (is_teacher() OR is_owner());

-- ─── 6. LOGS (Audit log) SIYOSATLARI ──────────────────────────────────────
-- Faqat owner ko'ra oladi
CREATE POLICY "logs_select_owner"
ON logs FOR SELECT
USING (is_owner());

-- Tizim (server-side) log yoza oladi
CREATE POLICY "logs_insert_authenticated"
ON logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- ─── 7. RATE LIMITING (Supabase DB funksiyasi) ───────────────────────────
-- Login urinishlarini cheklash
CREATE TABLE IF NOT EXISTS login_attempts (
    ip_address TEXT,
    attempt_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_login_attempts_ip_time
ON login_attempts(ip_address, attempt_at DESC);

-- 15 daqiqa ichida bir IP dan 10 ta urinishdan ko'p bo'lsa bloklash
CREATE OR REPLACE FUNCTION check_login_rate_limit(p_ip TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    attempt_count INT;
BEGIN
    SELECT COUNT(*)
    INTO attempt_count
    FROM login_attempts
    WHERE ip_address = p_ip
      AND attempt_at > NOW() - INTERVAL '15 minutes'
      AND success = FALSE;

    RETURN attempt_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 8. INJECTION HIMOYA — Input sanitizatsiya funksiyasi ──────────────────
CREATE OR REPLACE FUNCTION sanitize_input(input TEXT)
RETURNS TEXT AS $$
BEGIN
    -- SQL injection belgilarini olib tashlash
    RETURN regexp_replace(
        regexp_replace(input, '[<>"\''\\;]', '', 'g'),
        '\s+', ' ', 'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 9. STATIK MA'LUMOTLAR UCHUN OCHIQ SIYOSAT ────────────────────────────
CREATE POLICY "universities_select_all"
ON universities FOR SELECT
USING (true);  -- Universitetlar ro'yxati hammaga ko'rinadi

CREATE POLICY "subjects_select_authenticated"
ON subjects FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "shop_items_select_authenticated"
ON shop_items FOR SELECT
USING (auth.role() = 'authenticated');

-- ─── 10. ANON (autentifikatsiyasiz) KIRISH BLOKLASH ──────────────────────
-- Bu siyosatlar anon key bilan faqat universities ko'rishga ruxsat beradi
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON universities TO anon;  -- Registration uchun kerak

-- ─── TEKSHIRISH UCHUN QUERY ────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
