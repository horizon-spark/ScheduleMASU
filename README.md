# ScheduleMASU

Монорепозиторий MAUverse: мобильное приложение университета и API-прокси для него.

| Папка | Что это | Документация |
|---|---|---|
| [`mobile/`](./mobile) | Expo-клиент (Expo SDK 58, React Native, Expo Router) | [mobile/README.md](./mobile/README.md), [mobile/RELEASE.md](./mobile/RELEASE.md) |
| [`api/`](./api) | Express API: LDAP-авторизация и прокси расписания | [api/README.md](./api/README.md) |

## Требования

- Node.js 22+ и npm (в проекте закоммичены `package-lock.json`, lockfile v3).
- Docker Engine и Docker Compose v2 — для запуска API.
- Приложение Expo Go на телефоне или development build клиента.
- Для API — доступ к корпоративному LDAP и внешнему API расписания: настройки обязательны в любом окружении.

## Установка зависимостей

Пакеты независимые, корневого `package.json` нет — зависимости ставятся отдельно в `api/` и `mobile/`.

```bash
cd api && npm ci
cd mobile && npm ci
```

- `npm ci` — для чистого клона, CI и проверки воспроизводимости: ставит строго по `package-lock.json` и не меняет его.
- `npm install` — при повседневной работе и изменении зависимостей; обновлённый lock-файл нужно коммитить.
- Новые Expo-пакеты ставить через `npx expo install <package>`, а не `npm install`.

## Настройка окружения

Секреты в git не хранятся, `.env` нужно создать из примеров.

```bash
cp api/.env.example api/.env
cp mobile/.env.example mobile/.env
```

В `api/.env` заполните `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_CREDENTIALS`, `LDAP_SEARCH_BASE`, `SCHEDULE_API_URL`, `SCHEDULE_API_BEARER_TOKEN`. `JWT_SECRET` для разработки может быть коротким, но в production должен быть не короче 32 символов.

В `mobile/.env` задайте `EXPO_PUBLIC_API_BASE_URL` — адрес API-прокси, включая `/api`.

## Запуск: два терминала

### Терминал 1 — API

```bash
cd api
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Поднимаются `redis`, `api` и `nginx` (порт 80). Dev-оверлей обязателен: без него базовый compose работает как production и требует длинный `JWT_SECRET` и `REDIS_URL`, иначе контейнер API не стартует.

Проверка и логи:

```bash
curl http://127.0.0.1/health
curl http://127.0.0.1/ready
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api
```

Остановка:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

#### Вариант без Docker

```bash
cd api
npm ci
docker run -d --rm --name schedulemasu-redis -p 6379:6379 redis:7-alpine
# в api/.env укажите REDIS_URL=redis://127.0.0.1:6379
# и NODE_ENV=development, иначе сработают production-проверки секрета
npm run dev
```

Redis можно и не запускать: удалите или закомментируйте `REDIS_URL` — тогда
в development API работает без него, но refresh-токены не отзываются, а
rate-limit считается в памяти процесса. Если `REDIS_URL` задан, но Redis
недоступен, API всё равно стартует (с ограниченным ожиданием), `/ready`
возвращает 503, а вход/refresh отвечают 503 до восстановления Redis.

### Терминал 2 — мобильный клиент

```bash
cd mobile
npm ci
npx expo start
```

Адрес API зависит от платформы:

| Где запущен клиент | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Android-эмулятор | `http://10.0.2.2/api` |
| iOS-симулятор, web | `http://127.0.0.1/api` |
| Физический телефон | `http://<LAN-IP-компьютера>/api` |

Для телефона компьютер и устройство должны быть в одной сети, а порт 80 — доступен в файрволе. `localhost` с телефона указывает на сам телефон и не сработает. HTTP допустим только в development/preview; production-сборка требует `https://`.

`EXPO_PUBLIC_*` встраивается в бандл при старте dev-сервера, поэтому после правки `mobile/.env` перезапустите Expo (при проблемах с кешем — `npx expo start -c`).

## Проверка

- `GET http://127.0.0.1/health` — процесс API жив; `GET /ready` — доступны Redis и LDAP.
- В приложении выполните вход с доменной учётной записью и откройте расписание группы.
- `cd api && npm run lint && npm test` — линтер и API-тесты.
- `cd mobile && npx tsc --noEmit && npm run lint && npm test` — типы, линтер и тесты.
- CI (`.github/workflows/ci.yml`) прогоняет эти проверки на каждый push и pull request.

## Production

- API: TLS-оверлей, секреты, деплой и обновление — в [api/README.md](./api/README.md).
- CI/CD: сборка образов в GitHub Actions и pull-деплой через GHCR без сборки на сервере — в разделе [«CI/CD»](./api/README.md#cicd-сборка-в-github-actions-pull-деплой-на-сервере).
- Клиент: сборка через EAS, HTTPS, подпись и публикация в RuStore — в [mobile/RELEASE.md](./mobile/RELEASE.md).

## Частые проблемы

| Симптом | Причина и решение |
|---|---|
| API-контейнер перезапускается с `[ENV] JWT_SECRET must be at least 32 characters` | Запущен базовый compose без `docker-compose.dev.yml` либо в `.env` production-значения. Используйте dev-оверлей. |
| Телефон не подключается к API | Указан `localhost`; нужен LAN-IP компьютера, общая сеть и открытый порт 80. |
| Изменения в `mobile/.env` не применяются | Перезапустите `npx expo start` (при необходимости с `-c`). |
| `npm ci` падает с ошибкой рассинхронизации lock-файла | Выполните `npm install` в нужной папке и закоммитьте `package-lock.json`. |
