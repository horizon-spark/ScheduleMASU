# ScheduleMASU

Мобильное приложение с расписанием занятий Мурманского арктического университета: группы, преподаватели и аудитории, недели и семестры, кеш и офлайн-просмотр.

## Стек

- Expo SDK 58, React Native 0.88, React 19, TypeScript
- Expo Router (`src/app`)
- Axios + refresh-токены, SecureStore
- AsyncStorage для выбранного субъекта и кеша расписания
- API — прокси [`ExpressAPIGateway`](https://github.com/horizon-spark/ExpressGateway)

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
npx expo export --platform web   # проверка сборки
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

Целевая площадка — RuStore (Android). Порядок сборки, HTTPS-требования, подпись и чек-лист публикации: [RELEASE.md](./RELEASE.md).
