# ExpressAPIGateway

Прокси между мобильным приложением ScheduleMASU и LDAP/API расписания МАУ.

## Возможности

- `POST /api/login` — LDAP-аутентификация, выдача access/refresh токенов.
- `POST /api/refresh`, `POST /api/logout`, `GET /api/me`.
- Прокси расписания: институты, курсы, группы и подгруппы, преподаватели, корпуса и аудитории, расписание по группе/преподавателю/аудитории, доступные даты, время обновления.
- Redis-кеш, rate-limit, структурированные логи pino.
- `GET /health` — liveness, `GET /ready` — проверка Redis и LDAP.

## Требования

- Node.js 20+
- Redis
- Доступ к LDAP и внешнему API расписания
- Docker и Docker Compose (для деплоя)

## Окружение

Скопируйте `.env.example` в `.env` и заполните. В production обязательны:

- `NODE_ENV=production`
- `JWT_SECRET` длиной **не менее 32 символов** — иначе процесс не стартует;
- `REDIS_URL` — иначе не работают отзыв refresh-токенов и общий rate-limit;
- `SCHEDULE_API_BEARER_TOKEN` — токен внешнего API;
- `LDAP_*` — реквизиты сервисной учётной записи.

Сгенерировать секрет:

```bash
openssl rand -base64 48
# или, если openssl нет:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Ротация `JWT_SECRET` инвалидирует все текущие сессии — пользователям нужно войти заново.

## Локальный запуск

```bash
npm ci
cp .env.example .env
npm run dev
```

## Docker (HTTP, dev)

```bash
docker compose up -d --build
curl http://127.0.0.1/health
```

## TLS (production)

TLS включается оверлеем: базовый `docker-compose.yml` остаётся HTTP для разработки, production использует `docker-compose.tls.yml`.

1. Положите сертификаты в `nginx/certs/`:
   - `fullchain.pem` — цепочка сертификатов;
   - `privkey.pem` — приватный ключ (права `600`).
2. Для локальной проверки можно выпустить self-signed сертификат:
   ```bash
   ./scripts/generate-self-signed-cert.sh debian.mspu.edu.ru 10.1.2.99
   ```
   Для релиза используйте доверенный сертификат (Let's Encrypt или корпоративный CA): мобильное приложение не должно доверять самоподписанному сертификату.
3. Запустите с TLS:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
   ```
4. Проверьте:
   ```bash
   curl -k https://<host>/health
   curl -k https://<host>/ready
   ```
5. Откройте в firewall порты 80 и 443.

TLS-оверлей:

- редиректит HTTP → HTTPS;
- включает TLS 1.2/1.3;
- добавляет HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`;
- проксирует `/api/`, `/health` и `/ready`.

Для проверки конфигурации без запуска:

```bash
docker compose -f docker-compose.yml -f docker-compose.tls.yml config --quiet
docker run --rm --add-host api:127.0.0.1 \
  -v "$PWD/nginx/nginx.tls.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/nginx/certs:/etc/nginx/certs:ro" \
  nginx:1.25-alpine nginx -t
```

## Деплой и обновление

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
```

Проверьте `/health` и `/ready` после обновления. Секреты и сертификаты в git не хранятся.

## Замечания по безопасности

- `.env` и `nginx/certs/` исключены из git; права на `.env` — `600`.
- Production-процесс не стартует с коротким `JWT_SECRET` и без `REDIS_URL`.
- CORS сейчас открыт; для мобильного клиента это не критично, но при появлении web-клиента стоит ограничить источники.
- Логи не содержат токенов и паролей; для production настройте ротацию/сбор логов Docker.
