# HANDOFF — ScheduleMASU / MAUverse

Обновлено: **2026-11-27**

Репозиторий: <https://github.com/horizon-spark/ScheduleMASU>

Этот файл — точка входа для нового чата/разработчика. Секретов здесь нет:
пароли, PAT, `.env` и ключи подписи хранятся только локально/на сервере.

---

## 1. Текущее состояние

- Ветка: `main`.
- Рабочее дерево: чистое.
- `origin/main` синхронизирован с локальным.
- Последний feature-commit до handoff: `720e544`.
- GitHub Actions: последние runs зелёные, включая `720e544`; образы API и nginx
  собираются и публикуются в GHCR.
- Сервер: настроен pull-деплой через systemd; последний успешный деплой после
  фикса `b5b0643` нужно подтвердить через `journalctl` (см. раздел 6).
- TLS: домен `srv-project.mspu.edu.ru` резолвится в `10.1.3.62`; сервер пока
  работает по HTTP (443 закрыт), доступ только из сети университета.
  Корпоративный PEM-сертификат получен, но ещё не установлен.
- RuStore: **сборка не делалась**, package name и ключ подписи не финализированы.

---

## 2. Что это за проект

Монорепозиторий из двух независимых пакетов:

| Папка | Что это |
|---|---|
| `mobile/` | Expo SDK 58 / React Native 0.88 / Expo Router — приложение MAUverse |
| `api/` | Express-прокси: LDAP-вход, JWT, Redis-кеш, прокси расписания |

Документация:

- `README.md` — общая установка и запуск;
- `mobile/README.md` — мобильный клиент;
- `mobile/RELEASE.md` — RuStore/EAS;
- `api/README.md` — API, Docker, TLS, CI/CD;
- `mobile/assets/images/brand/README.md` — логотипы и правила бренда.

---

## 3. Mobile

### Стек и структура

- Expo SDK 58, React Native 0.88, React 19, TypeScript strict.
- Expo Router, файлы экранов в `mobile/src/app`.
- `expo-secure-store` для токенов и профиля.
- `AsyncStorage` для выбранного субъекта и кеша расписания.
- Axios + refresh-токены.
- Vitest для unit-тестов.

Основные маршруты:

```text
src/app/
  (auth)/login.tsx       вход
  (app)/index.tsx        расписание
  (app)/profile.tsx      профиль
  (app)/setup.tsx        первый запуск / выбор группы
  (app)/about.tsx        о приложении
```

`setup` и `about` — скрытые tab-маршруты, не показываются в tab bar.

### Авторизация

- `AuthContext` хранит access/refresh токены в SecureStore и профиль пользователя.
- `api/client.ts`:
  - подставляет access token;
  - на 401 делает refresh и повторяет запрос;
  - очередь параллельных refresh;
  - сетевые/5xx ошибки refresh не разлогинивают;
  - 400/401 при refresh очищают сессию, выбор и кеш;
  - безопасно парсит не-JSON ответы (nginx/шлюз может вернуть текст);
  - проверяет HTTPS для production.
- `api/auth.ts` маппит серверные коды ошибок в русские сообщения.

### Расписание

- `hooks/useSchedule.ts`:
  - читает выбранную группу/преподавателя/аудиторию;
  - cache-first из AsyncStorage;
  - свежесть клиентского кеша — 10 минут;
  - stale-while-revalidate;
  - pull-to-refresh с `?fresh=1`;
  - ревалидация при фокусе вкладки, возврате из фона и восстановлении сети;
  - `withRetry` на GET-запросах: первая попытка + один повтор;
  - повторяются network/timeout/408/502/503/504, не повторяются 4xx/429/отмена;
  - отображение `stale: true` из ответа API.
- `api/schedule.ts` — все ответы проходят через `normalize.ts`; битые поля не
  роняют экран.
- `utils/scheduleCache.ts`:
  - лимит 40 записей;
  - удаление старше 30 дней;
  - prune при старте и после записи;
  - хранит `stale`-флаг.
- `components/schedule/` — карточки, дни, недели, period picker, subject picker.
- Есть skeleton-загрузка, пустые/офлайн/ошибочные состояния и кнопки повтора.

### Первый запуск

- Если группа не выбрана, расписание предлагает «Настроить группу».
- `setup.tsx` загружает факультеты/курсы/группы через `useProfileSelection`.
- При ошибке API показывает inline-ошибку и «Повторить».
- Можно пропустить мастер и выбрать преподавателя/аудиторию.
- При потере сети `NetworkStatusProvider` показывает нижний баннер; при
  восстановлении сети расписание/профиль сами делают одну ревалидацию.

### Бренд и визуал

- Палитра и шрифты взяты с `https://mauniver.ru/info/design/`:
  - primary `#0064BE`, secondary `#008CFA`, white, `#1E1E1E`, серая палитра;
  - Montserrat — заголовки, Open Sans — текст.
- Логотипы: `mobile/assets/images/brand/`.
- Цветной логотип используется на белом, белый — на фирменном синем.
- Иконка/adaptive icon/splash/favicon пересобраны из официального SVG.
- `app.json`: iOS icon теперь `./assets/images/icon.png`.

### Доступность и адаптивность

QA-полировка 2026-11-27:

- `constants/theme.ts`: `fontScaleCaps` для компактных элементов с фиксированной
  высотой (tab bar, дни недели, строки модалок) — крупный системный шрифт
  больше не обрезает текст; обычный текст экранов масштабируется свободно.
- Контраст: `textMuted` затемнён до `#5F6773` (≥ 4.5:1 на фоне), полупрозрачный
  текст на синем заголовке усилен до 0.85/0.92.
- Tab bar: свои `tabBarLabel` с ограничением масштаба; иконки и подписи не
  разъезжаются при крупном шрифте.
- Safe area: setup получил нижний inset, about/setup имеют безопасный fallback
  для «Назад» (`router.canGoBack()`), брендовые плашки не выходят за экран на
  узких устройствах.
- Модалки: `statusBarTranslucent` + `navigationBarTranslucent`, прокрутка в
  карточке группы, тексты и touch-targets приведены к 44 pt.
- Доступность: озвучены строки настроек, выход, кнопки повтора, карточка
  занятия читается одним блоком, skeleton помечен как `progressbar`,
  error/stale/offline-баннеры анонсируются (`accessibilityLiveRegion`).
- Надёжность: защита от гонок при быстром переключении факультета/курса,
  повторный pull-to-refresh не дублируется, ошибка сбрасывается при переходе
  на свежий кеш.

### Тесты

```bash
cd mobile
npm test                 # Vitest, 37 тестов
npx tsc --noEmit
npm run lint             # expo lint
```

Тесты покрывают нормализацию, даты/семестры, ошибки запросов, retry и cache
policy. Web-экспорт после QA-правок проходит:
`EXPO_PUBLIC_API_BASE_URL=https://example.com/api npx expo export --platform web`.

---

## 4. API

### Что умеет

- `POST /api/login` — LDAP-аутентификация, access/refresh.
- `POST /api/refresh` — ротация refresh; при повторном использовании отзываются
  все сессии пользователя.
- `POST /api/logout`.
- `GET /api/me`.
- Прокси расписания: факультеты, курсы, группы, подгруппы, преподаватели,
  аудитории, корпуса, даты, расписание группы/преподавателя/аудитории.
- `GET /health` — liveness.
- `GET /ready` — Redis + LDAP.
- Redis-кеш, rate-limit, helmet, CORS, pino.

### Кеш и stale-if-error

- Обычный кеш — с коротким TTL.
- Последний успешный ответ дополнительно хранится `CACHE_STALE_TTL_SEC`
  (по умолчанию 24 часа).
- При network/408/5xx upstream API отдаёт stale-копию:
  - заголовок `X-Data-Stale: 1`;
  - поле `stale: true` в теле.
- При 4xx stale не отдаётся.
- `?fresh=1` обновляет кеш, но при ошибке тоже может отдать stale.

### Безопасность

- `helmet`, CORS в production выключен по умолчанию, `CORS_ORIGINS` для web.
- Refresh-токены хранятся в Redis с индексом `rt:user:<sub>`.
- При reuse detection отзываются все сессии пользователя.
- LDAP-профиль без `sAMAccountName` отклоняется.
- Nginx для 502/503/504 отдаёт JSON, а не HTML.

### Команды

```bash
cd api
npm ci
npm run lint
npm test                 # node:test + supertest, 24 теста
npm audit --omit=dev --audit-level=high
```

Тесты используют фиктивный Redis и локальный mock upstream. Реальный Redis/LDAP
для тестов не нужен.

---

## 5. CI/CD

### GitHub Actions

Файл: `.github/workflows/ci.yml`.

Jobs:

1. `API` — npm ci, lint, tests, audit.
2. `Mobile` — npm ci, tsc, expo lint, Vitest, audit.
3. `Docker images` — после успешных тестов собирает и публикует:
   - `ghcr.io/horizon-spark/schedulemasu-api`;
   - `ghcr.io/horizon-spark/schedulemasu-nginx`.

Теги:

- push в `main`: `sha-<commit>`, `main`, `staging`, `latest`;
- push тега `v*`: `sha-<commit>`, `1.0.0`, `production`.

SSH-деплоя из Actions нет: сервер за NAT.

### Pull-деплой на сервере

Файлы:

```text
api/deploy/deploy.sh
api/deploy/deploy.env.example
api/deploy/systemd/schedulemasu-deploy.service
api/deploy/systemd/schedulemasu-deploy.timer
```

Схема:

- systemd-таймер запускает deploy каждые 5 минут;
- скрипт логинится в GHCR (если задан `GHCR_TOKEN`);
- `docker compose pull api nginx`;
- проверяет image ID и label `org.opencontainers.image.revision`;
- при изменении делает `git fetch/checkout` на ревизию образа;
- `docker compose up -d --no-build`;
- ждёт `healthy` у API, проверяет nginx;
- state-файл: `/var/lib/schedulemasu/deploy.state`;
- lock: `/var/lock/schedulemasu-deploy.lock`.

Текущий сервер (по последней информации):

- Ubuntu/Linux, Docker установлен;
- репозиторий: `/opt/schedulemasu`;
- `DEPLOY_PATH=/opt/schedulemasu/api`;
- для теста используется `IMAGE_TAG=staging`;
- TLS пока не установлен, поэтому `COMPOSE_FILES="-f docker-compose.yml"`;
  после установки сертификата добавить `-f docker-compose.tls.yml`;
- `PULL_GIT=1`, репозиторий склонирован от root.

**Важно:** systemd запускает установленную копию
`/usr/local/bin/schedulemasu-deploy`, а не файл из репозитория. После изменения
`api/deploy/deploy.sh` нужно переустановить:

```bash
sudo install -m 755 /opt/schedulemasu/api/deploy/deploy.sh /usr/local/bin/schedulemasu-deploy
```

Проверка:

```bash
sudo systemctl status schedulemasu-deploy.service --no-pager -l
sudo journalctl -u schedulemasu-deploy.service -n 100 --no-pager
systemctl list-timers schedulemasu-deploy.timer
```

Известный уже исправленный баг: Compose подставлял только `API_IMAGE` без
`IMAGE_TAG`, поэтому скачивал `:latest`, а скрипт проверял `:staging`. Исправлено
в `b5b0643`.

---

## 6. Последние важные изменения

- 2026-11-27 — QA-полировка mobile: масштаб шрифтов и tab bar, safe area,
  контраст, accessibility-подписи, модалки edge-to-edge, защита от гонок в
  выборе группы.
- `720e544` — stale-if-error на API + stale-баннер в мобильном клиенте.
- `49c3e58` — первый запуск/мастер настройки группы + offline-баннер и
  ревалидация при восстановлении сети.
- `1f4b151` — не падать на не-JSON ответах прокси; nginx отдаёт JSON для 502/503/504.
- `6a49145` — bounded retry и ручные кнопки повтора.
- `b5b0643` — исправлена передача тега образа в pull-деплое.
- `ffe91f7` — исправлен запуск API-тестов на Node 24 и обновлены GitHub Actions.
- `5f814f0` — фирменный стиль МАУ: цвета, шрифты, логотипы, иконки.
- `b633ffa` — академическая визуальная система.
- `1153de3` — splash, error boundary, профиль, кеш, About.
- `194f2fb` — безопасность refresh-сессий, helmet/CORS.
- `8ce4e4c` — pull-деплой под NAT.

---

## 7. Что осталось до релиза

### P0 — проверить сейчас

- Убедиться, что после `b5b0643` на сервере установлен новый deploy-скрипт и
  `systemctl start schedulemasu-deploy.service` завершается успешно.
- Проверить `/health` и `/ready` на сервере.
- Проверить в приложении первый запуск, setup, offline-баннер и stale-баннер.

### P1 — до TLS/RuStore

- ~~Обновить Expo-пакеты по `npx expo install --check`~~ — сделано 2026-11-27
  (`expo ~58.1.0`, 13 пакетов, `expo-doctor` 20/20, web-экспорт проходит);
  осталось перепроверить release-сборку на Android-устройстве.
- Добавить в CI `expo-doctor`, smoke-test Docker-образа, `trivy`, `gitleaks`,
  Dependabot.
- QA на Android-устройстве: маленький экран, крупный шрифт, safe area, tab bar,
  splash/icon, retry/offline, refresh-токены. Код-левел правки под крупный
  шрифт/доступность сделаны 2026-11-27, но требуют проверки на реальном
  устройстве (особенно TalkBack и жестовая навигация).
- Подготовить политику конфиденциальности и контакты поддержки.
- Заменить шаблонную `mobile/LICENSE` (Expo MIT) на решение вуза.
- Убрать/проверить неиспользуемые `assets/expo.icon`.

### P2 — перед RuStore

- Решить package name:
  - обновление старого `com.pmi.mauverse2` (нужен ключ подписи и versionCode);
  - или новое приложение (согласовать снятие/переименование старого).
- Текущий package `com.horizon_spark.ScheduleMASU` — рабочее, не финальное.
- Настроить EAS credentials, versionCode, production env.
- Подготовить иконку/скриншоты/описание/категорию/возрастной рейтинг.

### P3 — после/по желанию

- TLS: установить полученный корпоративный сертификат на
  `srv-project.mspu.edu.ru` через `api/scripts/install-tls-cert.sh`, включить
  `docker-compose.tls.yml` в `COMPOSE_FILES`, проверить доверие CA на тестовых
  устройствах. Внешний доступ и Let's Encrypt не планируются.
- Мониторинг `/health`/`/ready`, алерты, ротация логов Docker.
- Бэкап `.env`, сертификатов и ключей подписи.
- Crash-reporting/аналитика, OTA (`expo-updates`) — по решению.
- Тёмная тема, дополнительная accessibility-полировка.

---

## 8. Известные ограничения

- Expo-пакеты обновлены 2026-11-27: `expo ~58.1.0` и 12 совместимых модулей.
  `npx expo install --check` и `npx expo-doctor` (20/20) проходят; в
  `app.json` добавлены config-плагины `expo-image`, `expo-status-bar`,
  `expo-web-browser`, которые CLI не смог дописать в динамический конфиг.
- Первый запуск не редиректит автоматически в setup: пользователь видит CTA
  «Настроить группу».
- Stale-if-error работает только при доступном Redis и наличии прошлого
  успешного ответа. При самом первом входе кеша нет.
- Автоматического rollback при неудачном health-check нет: deploy падает, старые
  контейнеры/образы нужно откатывать вручную.
- TLS будет доступен только из сети университета: внешние порты 80/443 не
  проброшены. Let's Encrypt/HTTP-01 неприменим, нужен корпоративный CA.
- Корпоративный CA должен быть доверен на тестовых устройствах. На личном
  Android пользовательский CA не доверяется приложению без managed-профиля или
  network security config; Expo Go может не доверять такому CA.
- В репозитории нет E2E-тестов и тестов на реальном LDAP.
- `mobile/.env` и `api/.env` не в git; не коммитить.

---

## 9. Полезные команды

```bash
# Mobile
cd mobile
npm ci
npm test
npx tsc --noEmit
npm run lint
npx expo start -c

# API
cd api
npm ci
npm test
npm run lint

# Локальный API без Docker
NODE_ENV=development REDIS_URL= npm run dev

# Docker dev
cd api
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Проверка web-экспорта (нужен HTTPS URL):

```bash
cd mobile
EXPO_PUBLIC_API_BASE_URL=https://example.com/api npx expo export --platform web
```

---

## 10. Правила для следующего агента

1. Сначала прочитать `README.md`, `api/README.md`, `mobile/README.md`, `RELEASE.md`.
2. Не коммитить `.env`, токены, сертификаты и ключи подписи.
3. Перед изменениями проверять `git status` — рабочее дерево должно быть чистым.
4. Для API использовать Node 24-совместимые команды: `node --test` без каталога.
5. После изменений запускать:
   - API: `npm run lint && npm test`;
   - Mobile: `npm test && npx tsc --noEmit && npm run lint`.
6. Не пушить без явного разрешения пользователя.
7. После изменения `api/deploy/deploy.sh` напоминать про переустановку скрипта
   на сервере.
8. Для визуальных изменений проверять `expo export --platform web` и, по
   возможности, Android-устройство/release build.
