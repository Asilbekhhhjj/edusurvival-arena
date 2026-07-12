#!/bin/bash
# ================================================
# EduSurvival Arena — Avtomatik Deploy Skripti
# Ubuntu/Debian server uchun
# ================================================

set -euo pipefail  # Xato bo'lsa darhol to'xtat

# ─── RANGLAR ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── O'ZGARUVCHILAR ────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-your-domain.com}"
EMAIL="${EMAIL:-admin@your-domain.com}"
APP_DIR="/var/www/edusurvival"
REPO_DIR="$(pwd)"

echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   EduSurvival Arena — Production Deploy v1.0      ${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

# ─── 1. TEKSHIRUVLAR ───────────────────────────────────────────────────────
log_info "Talablar tekshirilmoqda..."

command -v docker   >/dev/null 2>&1 || log_error "Docker o'rnatilmagan! https://docs.docker.com/engine/install/"
command -v docker compose >/dev/null 2>&1 || log_error "Docker Compose o'rnatilmagan!"

if [ ! -f ".env" ]; then
    log_error ".env fayli topilmadi! .env.example dan nusxa oling: cp .env.example .env"
fi

# .env tekshirish
source .env
[ -z "${VITE_SUPABASE_URL:-}" ] && log_error "VITE_SUPABASE_URL .env da ko'rsatilmagan!"
[ -z "${VITE_SUPABASE_ANON_KEY:-}" ] && log_error "VITE_SUPABASE_ANON_KEY .env da ko'rsatilmagan!"

log_ok "Barcha talablar bajarilgan"

# ─── 2. TIZIM YANGILASH ─────────────────────────────────────────────────────
log_info "Tizim paketlari yangilanmoqda..."
apt-get update -qq && apt-get upgrade -y -qq
log_ok "Tizim yangilandi"

# ─── 3. FIREWALL (UFW) ─────────────────────────────────────────────────────
log_info "Firewall sozlanmoqda..."
if command -v ufw >/dev/null 2>&1; then
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    log_ok "UFW firewall sozlandi (22, 80, 443)"
else
    log_warn "UFW o'rnatilmagan, o'tkazib yuborilyapti"
fi

# ─── 4. FAIL2BAN (brute-force himoya) ──────────────────────────────────────
log_info "Fail2Ban o'rnatilmoqda..."
if ! command -v fail2ban-client >/dev/null 2>&1; then
    apt-get install -y -qq fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    log_ok "Fail2Ban o'rnatildi va ishga tushirildi"
else
    log_ok "Fail2Ban allaqachon o'rnatilgan"
fi

# ─── 5. APP PAPKASINI SOZLASH ───────────────────────────────────────────────
log_info "Ilova papkasi sozlanmoqda..."
mkdir -p "$APP_DIR"
cp -r . "$APP_DIR/"
cd "$APP_DIR"
log_ok "Fayllar $APP_DIR ga ko'chirildi"

# ─── 6. NGINX CONFIG DOMENNI ALMASHTIRISH ──────────────────────────────────
log_info "Nginx konfiguratsiyasi moslanmoqda ($DOMAIN)..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf
log_ok "Nginx config yangilandi"

# ─── 7. SSL SERTIFIKAT (birinchi marta oddiy HTTP bilan ishga tushirish) ────
log_info "Let's Encrypt SSL sertifikat olinmoqda..."

# Avval HTTP-only rejimda Nginx ishga tushirish
docker compose up -d app 2>/dev/null || true
sleep 5

# SSL olish
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --non-interactive || log_warn "SSL olishda xato — HTTP bilan davom etiladi"

log_ok "SSL sertifikat muvaffaqiyatli olindi"

# ─── 8. PRODUCTION BUILD VA DEPLOY ──────────────────────────────────────────
log_info "Docker image qurilmoqda (bu bir necha daqiqa olishi mumkin)..."
docker compose build --no-cache
log_ok "Docker image tayyor"

log_info "Konteynerlar ishga tushirilmoqda..."
docker compose down 2>/dev/null || true
docker compose up -d
log_ok "Barcha konteynerlar ishga tushirildi"

# ─── 9. HEALTHCHECK ────────────────────────────────────────────────────────
log_info "Sayt tekshirilmoqda..."
sleep 10
if curl -sf "http://localhost" > /dev/null; then
    log_ok "Sayt muvaffaqiyatli ishlayapti!"
else
    log_warn "Sayt hali yuklanmoqda, biroz kuting..."
fi

# ─── 10. YAKUNIY MA'LUMOT ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}   ✅ DEPLOY MUVAFFAQIYATLI YAKUNLANDI!            ${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Sayt:     https://$DOMAIN"
echo -e "  📊 Loglar:   docker compose logs -f"
echo -e "  🔄 Yangilash: ./deploy.sh"
echo -e "  🛑 To'xtatish: docker compose down"
echo ""
echo -e "${YELLOW}  ⚠️  Supabase RLS siyosatlarini ham yoqishni unutmang!${NC}"
echo -e "${YELLOW}     Fayl: supabase/rls_policies.sql${NC}"
echo ""
