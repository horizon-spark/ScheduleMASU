# MAUverse

MAUverse — мобильное приложение Мурманского арктического университета. Текущий репозиторий называется `ScheduleMASU`, но продукт развивается как замена не поддерживаемого сейчас приложения Mauverse.

Сейчас в приложении: расписание групп, преподавателей и аудиторий, профиль и авторизация через LDAP. Дальше — полноценный кабинет: главная, сервисы, успеваемость и другие разделы.

## Стек

- Expo SDK 58, React Native 0.88, React 19, TypeScript
- Expo Router (`src/app`)
- Axios + refresh-токены, SecureStore
- AsyncStorage для выбранного субъекта и кеша расписания
- API — прокси в папке [`api/`](../api) этого репозитория

## Запуск

```bash
npm install
cp .env.example .env
# укажите EXPO_PUBLIC_API_BASE_URL
npm start
```

Для локальной разработки допустим HTTP-адрес прокси. Production-сборка требует `https://` — это проверяется в `app.config.js` и `src/api/client.ts`.

## Команды

```bash
npm start                 # Expo dev server
npm run android           # Android
npm run ios               # iOS (в релизе пока не используется)
npm run web               # web-сборка
npx tsc --noEmit          # typecheck
npm run lint              # eslint (expo lint)
npm test                  # unit-тесты (vitest)

# web-export — это production-бандл, поэтому нужен HTTPS-адрес API:
EXPO_PUBLIC_API_BASE_URL=https://example.com/api npx expo export --platform web
# Windows PowerShell:
# $env:EXPO_PUBLIC_API_BASE_URL='https://example.com/api'; npx expo export --platform web

npx expo-doctor           # диагностика зависимостей
```

## Структура

```
src/
  api/         клиент, авторизация, эндпоинты расписания
  app/         экраны Expo Router: (auth), (app)
  components/  schedule/*, profile/*
  constants/   календарь, тема
  context/     AuthContext
  hooks/       useSchedule, useProfileSelection
  types/       субъект расписания
  utils/       storage, cache, subjects, errors
```

## Релиз

Целевая площадка — RuStore (Android). Порядок сборки, HTTPS-требования, подпись, замена старого Mauverse и чек-лист публикации: [RELEASE.md](./RELEASE.md).
