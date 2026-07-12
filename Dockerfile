# ================================================
# EduSurvival Arena — Dockerfile
# Multi-stage build: kichik va xavfsiz image
# ================================================

# ─── STAGE 1: Build ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Ishchi katalog
WORKDIR /app

# Paket fayllarini avval nusxalash (cache uchun)
COPY package*.json ./

# Faqat production dependencies o'rnatish
RUN npm ci --frozen-lockfile

# Manba kodini nusxalash
COPY . .

# Production build
RUN npm run build

# ─── STAGE 2: Production (Nginx) ─────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Xavfsizlik: root bo'lmagan foydalanuvchi
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Build natijasini Nginx papkasiga ko'chirish
COPY --from=builder /app/dist /var/www/edusurvival/dist

# Nginx konfiguratsiyasini o'rnatish
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Log papkasini sozlash
RUN mkdir -p /var/log/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /var/www/edusurvival && \
    chown -R appuser:appgroup /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

# Port ochish
EXPOSE 80
EXPOSE 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/index.html || exit 1

# Nginx ishga tushirish
CMD ["nginx", "-g", "daemon off;"]
