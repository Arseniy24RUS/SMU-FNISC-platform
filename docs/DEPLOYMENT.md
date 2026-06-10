# Развёртывание

## Локально

```bash
# в ZIP уже есть .env.local для локальной отладки
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm seed
pnpm scopus:test
pnpm photos:fetch
pnpm dev
```

## Production-вариант

Рекомендуемая схема: Next.js на Node runtime, PostgreSQL, S3/MinIO для фото, отдельный cron/worker, reverse proxy с HTTPS, секреты в vault/CI variables.

`DATABASE_URL` заменить на PostgreSQL. В `prisma/schema.prisma` поменять provider с `sqlite` на `postgresql` перед production-миграцией.

## GitHub Pages

GitHub Pages используется как статическая публичная витрина проекта:

```bash
pnpm build:pages
```

Команда выставляет `NEXT_PUBLIC_DEPLOY_TARGET=github-pages`, `NEXT_PUBLIC_SITE_URL=https://arseniy24rus.github.io/SMU-FNISC-platform`, включает static export и собирает `out/` с `basePath=/SMU-FNISC-platform`.

Ограничение: GitHub Pages не исполняет Node.js, поэтому `/api/*`, LLM-черновики, Prisma и harvest-задачи работают только в локальном/серверном режиме. Онлайн-страницы в Pages-сборке показывают эти действия как локальные и не отправляют POST-запросы.

Workflow `.github/workflows/pages.yml` на `main` выполняет `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm audit:public-data`, `pnpm build:pages`, добавляет `out/.nojekyll` и публикует artifact через GitHub Pages Actions.

Перед публикацией в публичный репозиторий не добавляйте `.env.local`, `data/local`, `prisma/dev.db`, raw/cache harvest-данные и локальные логи.

## Cron

Для ежедневного обновления:

```bash
curl -X POST https://site.ru/api/sync/publications -H "Authorization: Bearer $CRON_SECRET" -d '{"identifiers":{"elibrary_author_id":"1012909"}}'
curl -X POST https://site.ru/api/sync/media -H "Authorization: Bearer $CRON_SECRET" -d '{"fullName":"Ситковский Арсений Михайлович"}'
```

В реальном режиме лучше запускать `scripts/sync-publications.ts` и `scripts/sync-media.ts` в очереди, чтобы не держать долгие задачи в HTTP-запросе.


## Локальная проверка Scopus

`.env.local` содержит тестовый `SCOPUS_API_KEY` и `SCOPUS_TEST_AUTHOR_ID=57220956828`. Проверка:

```bash
pnpm scopus:test
pnpm scopus:test 57213175159
```

Результат записывается в `data/generated/scopus-test/<authorId>.json`. Для полного обновления публикаций по публичному seed:

```bash
pnpm sync:publications
```

## Фотографии профилей

В `public/members/photos/` приложены SVG-аватары. Чтобы подтянуть реальные фотографии с профильных страниц, выполните:

```bash
pnpm photos:fetch
```

Скрипт читает `data/seeds/members.public.json`, открывает профиль ФНИСЦ/ИС РАН/СИ РАН, ищет наиболее вероятный `<img>` профиля, сохраняет файл в `public/members/photos/` и обновляет `photo_url`, `photo_status`, `photo_source_url`.
