# ScheduleMASU API

Прокси между мобильным приложением ScheduleMASU и LDAP/API расписания МАУ.

## Возможности

- `POST /api/login` — LDAP-аутентификация, выдача access/refresh токенов.
- `POST /api/refresh`, `POST /api/logout`, `GET /api/me`.
- Прокси расписания: институты, курсы, группы и подгруппы, преподаватели, корпуса и аудитории, расписание по группе/преподавателю/аудитории, доступные даты, время обновления.
- Redis-кеш, stale-if-error (последний успешный ответ при падении upstream), rate-limit, структурированные логи pino.
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
- `CACHE_STALE_TTL_SEC` — сколько хранить последний успешный ответ для
  stale-if-error (по умолчанию 86400 секунд);
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

## TLS (внутренний контур)

Текущая схема:

- домен — `srv-project.mspu.edu.ru`;
- сертификат — корпоративный CA университета;
- сервер доступен только из сети университета, порты 80/443 наружу не
  проброшены;
- Let's Encrypt/HTTP-01 в такой схеме не используется: внешний CA не сможет
  проверить домен.

TLS включается оверлеем: базовый `docker-compose.yml` остаётся HTTP для
разработки, production использует `docker-compose.tls.yml`.

### 1. DNS

Во внутренней DNS-зоне `mspu.edu.ru` должна быть A-запись:

```text
srv-project.mspu.edu.ru -> <внутренний IP сервера>
```

Проверьте с сервера и с тестового телефона:

```bash
getent hosts srv-project.mspu.edu.ru
# или
nslookup srv-project.mspu.edu.ru
```

Пока записи нет, HTTPS работать не будет: клиент не сможет разрешить имя.

### 2. Сертификат от корпоративного CA

Запросите сертификат на `srv-project.mspu.edu.ru` (CN и SAN должны содержать
это имя). Нужны два файла:

- `fullchain.pem` — листовой сертификат + промежуточные CA, без корневого;
- `privkey.pem` — приватный ключ без пароля.

Если CA выдаёт `.pfx`/`.p12`, сконвертируйте:

```bash
openssl pkcs12 -in cert.pfx -clcerts -nokeys -out leaf.pem
openssl pkcs12 -in cert.pfx -nocerts -nodes -out privkey.pem
# intermediate.pem — цепочка промежуточных сертификатов от CA
cat leaf.pem intermediate.pem > fullchain.pem
```

Установите сертификат скриптом (он проверит соответствие ключа и цепочку):

```bash
cd /opt/schedulemasu/api
./scripts/install-tls-cert.sh /path/fullchain.pem /path/privkey.pem /path/ca-root.pem
```

Без корневого сертификата для проверки:

```bash
./scripts/install-tls-cert.sh /path/fullchain.pem /path/privkey.pem
```

Скрипт кладёт файлы в `nginx/certs/` с правами `600`. Каталог исключён из git,
поэтому деплой через `git checkout --force` сертификаты не удаляет.

Проверить вручную:

```bash
openssl x509 -in nginx/certs/fullchain.pem -noout \
  -subject -issuer -dates -ext subjectAltName
openssl verify -CAfile /path/ca-root.pem nginx/certs/fullchain.pem
```

### 3. Запуск с TLS

```bash
cd /opt/schedulemasu/api
docker compose -f docker-compose.yml -f docker-compose.tls.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d --no-build
```

Для pull-деплоя в `/etc/schedulemasu/deploy.env`:

```bash
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.tls.yml"
```

Затем:

```bash
sudo systemctl start schedulemasu-deploy.service
sudo journalctl -u schedulemasu-deploy.service -n 100 --no-pager
```

Порты 80 и 443 должны быть открыты в firewall сервера, даже если доступ только
из внутренней сети:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 4. Проверка

С сервера и с тестового устройства в сети университета:

```bash
curl -I http://srv-project.mspu.edu.ru/health   # 301 → https
curl https://srv-project.mspu.edu.ru/health
curl https://srv-project.mspu.edu.ru/ready

openssl s_client -connect srv-project.mspu.edu.ru:443 \
  -servername srv-project.mspu.edu.ru \
  -CAfile /path/ca-root.pem </dev/null
```

TLS-оверлей:

- редиректит HTTP → HTTPS;
- включает TLS 1.2/1.3;
- добавляет HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`;
- проксирует `/api/`, `/health` и `/ready`.

### 5. Доверие к корпоративному CA на устройствах

Сам по себе сертификат сервера недостаточен: тестовое устройство должно
доверять корневому сертификату университетского CA.

- **Android:** пользовательский CA, установленный через настройки, по умолчанию
  не доверяется приложениям (API 24+). Нужен управляемый корпоративный профиль
  с CA в системном хранилище или development build с network security config,
  разрешающим пользовательские CA. Expo Go может не доверять такому CA.
- **iOS:** установите профиль CA и включите полное доверие в
  `Settings → General → About → Certificate Trust Settings`.
- Если тестовые устройства не могут доверять корпоративному CA, для проверки
  HTTPS используйте публичный сертификат либо временно оставьте HTTP в
  preview-сборке. В production самоподписанный/недоверенный сертификат
  недопустим.

`nginx.tls.conf` для тестового внутреннего домена включает HSTS с коротким
`max-age=300`. После стабилизации домена и CA увеличьте его до `31536000`.
Не включайте длинный HSTS, пока сертификат или CA могут смениться.

### 6. Продление

Корпоративный сертификат продлевается вручную. После получения новых файлов:

```bash
cd /opt/schedulemasu/api
./scripts/install-tls-cert.sh /path/new-fullchain.pem /path/new-privkey.pem /path/ca-root.pem
docker compose -f docker-compose.yml -f docker-compose.tls.yml exec nginx nginx -s reload
```

Для локальной проверки без корпоративного CA можно выпустить self-signed
сертификат (только для тестов, не для приложения):

```bash
./scripts/generate-self-signed-cert.sh srv-project.mspu.edu.ru <внутренний-IP>
```

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
