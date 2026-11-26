# ScheduleMASU API

Прокси между мобильным приложением ScheduleMASU и LDAP/API расписания МАУ.

## Возможности

- `POST /api/login` — LDAP-аутентификация, выдача access/refresh токенов.
- `POST /api/refresh`, `POST /api/logout`, `GET /api/me`.
- Прокси расписания: институты, курсы, группы и подгруппы, преподаватели, корпуса и аудитории, расписание по группе/преподавателю/аудитории, доступные даты, время обновления.
- Redis-кеш, rate-limit, структурированные логи pino.
- `GET /health` — liveness, `GET /ready` — проверка Redis и LDAP.

## Требования

- Node.js 22+
- Redis
- Доступ к LDAP и внешнему API расписания
- Docker и Docker Compose (для деплоя)

## Окружение

Скопируйте `.env.example` в `.env` и заполните. В production обязательны:

- `NODE_ENV=production`
- `JWT_SECRET` длиной **не менее 32 символов** — иначе процесс не стартует;
- `REDIS_URL` — иначе не работают отзыв refresh-токенов и общий rate-limit;
  при недоступном Redis API стартует, но `/ready` и вход/refresh отвечают 503;
- `REDIS_CONNECT_TIMEOUT_MS` — сколько ждать Redis при старте (по умолчанию 2000);
- `SCHEDULE_API_BEARER_TOKEN` — токен внешнего API;
- `LDAP_*` — реквизиты сервисной учётной записи;
- `CORS_ORIGINS` — необязательно, только для web-клиента. В production при
  пустом значении CORS выключен.

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
# для локального запуска без Docker:
#   NODE_ENV=development
#   REDIS_URL=redis://127.0.0.1:6379 (или удалите строку — Redis не обязателен)
npm run dev
```

`.env.example` рассчитан на production: в нём `NODE_ENV=production` и короткий
`JWT_SECRET`, поэтому без правки этих значений процесс намеренно не стартует.
Redis при старте ждём не дольше `REDIS_CONNECT_TIMEOUT_MS`; если он недоступен,
API поднимается, `/ready` отдаёт 503, а вход/refresh — 503 до восстановления.

## Тесты

```bash
npm test        # node:test + supertest, внешние зависимости замоканы
npm run lint    # eslint
```

## Docker (HTTP, dev)

Базовый compose использует `.env`, где `NODE_ENV=production`. С коротким `JWT_SECRET`
API намеренно не стартует. Для локальной разработки используйте dev-оверлей:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
curl http://127.0.0.1/health
```

Он выставляет `NODE_ENV=development` только контейнеру API: production-проверки
секрета и Redis отключаются, TLS не требуется.

Если нужен HTTPS локально:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.tls.yml up -d --build
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

## CI/CD: сборка в GitHub Actions, pull-деплой на сервере

Сервер находится за NAT, поэтому GitHub Actions не может зайти на него по SSH.
Схема развёрнута наоборот: CI собирает образы, а сервер сам забирает их из GHCR
по таймеру.

1. Push/PR → `.github/workflows/ci.yml` прогоняет lint, тесты и typecheck.
2. Push в `main` → после проверок собираются образы:
   - `ghcr.io/horizon-spark/schedulemasu-api:sha-<commit>`, `:main`, `:staging`, `:latest`;
   - `ghcr.io/horizon-spark/schedulemasu-nginx:sha-<commit>`, `:main`, `:staging`, `:latest`.
3. Push тега `v*` → образы получают `:1.0.0`, `:production` и `:sha-<commit>`.
4. На сервере systemd-таймер запускает `deploy/deploy.sh`. Скрипт:
   - логинится в GHCR;
   - скачивает `production` (или `staging`) образы;
   - по label `org.opencontainers.image.revision` переключает checkout на коммит,
     из которого собраны образы;
   - перезапускает compose только если изменился образ/ревизия;
   - ждёт `healthy` у API и пишет ревизию в state-файл.

Node-зависимости и Dockerfile на сервере **не собираются**.

### Установка на сервере

На сервере должен быть checkout репозитория, например `/opt/schedulemasu`,
заполненный `api/.env` и сертификаты в `api/nginx/certs/`.

```bash
cd /opt/schedulemasu

sudo install -m 755 api/deploy/deploy.sh /usr/local/bin/schedulemasu-deploy
sudo mkdir -p /etc/schedulemasu /var/lib/schedulemasu
sudo cp api/deploy/deploy.env.example /etc/schedulemasu/deploy.env
sudo chmod 600 /etc/schedulemasu/deploy.env

# отредактируйте DEPLOY_PATH, IMAGE_TAG, GHCR_USER/GHCR_TOKEN
sudo nano /etc/schedulemasu/deploy.env

sudo cp api/deploy/systemd/schedulemasu-deploy.service /etc/systemd/system/
sudo cp api/deploy/systemd/schedulemasu-deploy.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now schedulemasu-deploy.timer

# первый деплой без ожидания таймера
sudo systemctl start schedulemasu-deploy.service
```

Логи:

```bash
sudo journalctl -u schedulemasu-deploy.service -f
systemctl list-timers schedulemasu-deploy.timer
```

Если TLS ещё не настроен, в `deploy.env` оставьте только базовый compose:

```bash
COMPOSE_FILES=-f docker-compose.yml
```

### GHCR-доступ

Пакеты GHCR по умолчанию приватные. Создайте PAT с правом `read:packages`
и укажите его в `deploy.env`:

```bash
GHCR_USER=github-user
GHCR_TOKEN=ghp_...
```

Если сделать пакеты публичными, `GHCR_*` можно не задавать.

### Релиз

```bash
git tag v1.0.0
git push origin v1.0.0
```

После успешной сборки тег `production` обновится, и в течение нескольких минут
таймер обновит контейнеры. Для предпродакшена можно поставить
`IMAGE_TAG=staging` и обновляться с `main`.

### Ручной деплой и откат

```bash
cd /opt/schedulemasu/api
export API_IMAGE=ghcr.io/horizon-spark/schedulemasu-api:sha-<commit>
export NGINX_IMAGE=ghcr.io/horizon-spark/schedulemasu-nginx:sha-<commit>

docker compose -f docker-compose.yml -f docker-compose.tls.yml pull api nginx
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --no-build --remove-orphans
```

Для отката подставьте `sha-<предыдущий commit>`: старые образы остаются локально.
`--no-build` гарантирует, что сервер не начнёт собирать образ при отсутствии
скачанного тега.

### Если сервер не должен ходить в GitHub

Поставьте `PULL_GIT=0` в `deploy.env`: скрипт будет только скачивать образы,
а compose-файлы нужно обновлять на сервере отдельно. Для текущей схемы достаточно
доступа по HTTPS к `ghcr.io` и `github.com`.

## Деплой вручную (без CI/CD)

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --build
```

Проверьте `/health` и `/ready` после обновления. Секреты и сертификаты в git не хранятся.

## Замечания по безопасности

- `.env` и `nginx/certs/` исключены из git; права на `.env` — `600`.
- Production-процесс не стартует с коротким `JWT_SECRET` и без `REDIS_URL`.
- CORS в production по умолчанию выключен: нативному клиенту он не нужен.
  Для web-клиента задайте `CORS_ORIGINS` (список origin через запятую).
- API добавляет security-заголовки через `helmet`; HSTS и TLS-заголовки
  добавляет nginx в TLS-оверлее.
- При повторном использовании уже ротированного refresh-токена отзываются
  все refresh-сессии пользователя, а не только подозрительный jti.
- Логи не содержат токенов и паролей; для production настройте ротацию/сбор логов Docker.
