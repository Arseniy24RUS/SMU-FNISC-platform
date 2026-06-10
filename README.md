# СМУ ФНИСЦ РАН — локальная ИТ-платформа

Next.js + TypeScript + Prisma + SQLite MVP для Совета молодых учёных ФНИСЦ РАН: состав, публикации, СМИ, карьерная карта, новости и локальный harvest.

## Быстрый запуск

На Windows дважды нажмите:

```text
ПУСК_СМУ_ФНИСЦ_РАН.cmd
```

Или вручную:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm seed
pnpm harvest:all:local
pnpm dev
```

Если `pnpm` не установлен, локальные скрипты используют `npm exec -- pnpm`.

## GitHub Pages

Публичная статическая версия собирается для стандартного Pages URL:

```bash
pnpm build:pages
```

GitHub Actions публикует содержимое `out/` на `https://arseniy24rus.github.io/SMU-FNISC-platform/`. В этом режиме работают публичные страницы-витрины; API, LLM, Prisma и harvest остаются в репозитории и запускаются локально через `pnpm dev` или локальные scripts.

## Локальные данные

Harvest сохраняет raw/cache/report:

- `data/local/harvest/<timestamp>/raw/*`
- `data/local/latest/`
- `data/public/*.json`
- `public/generated/harvest-summary.json`

Сайт читает реальные `data/public` и не падает при пустых или частичных данных.

## Секреты

API-ключи хранятся только в `.env.local` или переменных окружения. Не переносите значения ключей в код, документацию, отчёты или клиентский JavaScript.

## Проверка

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit:public-data
```

Подробности: `LOCAL_RUN.md`, `docs/HARVEST_LOCAL.md`, `docs/RELEASE_CHECKLIST.md`.
