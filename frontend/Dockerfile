# frontend/Dockerfile

# --- STAGE 1: Сборка статических файлов ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
# Собираем оптимизированный production-бандл в папку /app/dist
RUN npm run build

# --- STAGE 2: Финальный легковесный runtime-образ ---
FROM nginx:1.25-alpine

# Копируем скомпилированную статику из первого стейджа
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем наш конфиг Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
