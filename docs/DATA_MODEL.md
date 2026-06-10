# Модель данных MVP

## Seed

`data/seeds/members.public.json` содержит публичные академические поля: ФИО, институт, должность, степень, интересы, e-mail, публичные профили и идентификаторы. Телефоны и приватные комментарии не публикуются.

## Public JSON

- `members.json` — обезличенная публичная витрина состава.
- `publications.json` — канонические публикации с `sources`, DOI/id, citation fields и `memberSlugs`.
- `scientometrics.json` — верхняя сводка по источникам, годам, цитированиям и h-index.
- `career-map.json` — milestone-карта по каждому участнику.
- `media-mentions.json` — только опубликованные упоминания.
- `harvest-report.json` — статусы источников, warnings и пути к raw.

## Prisma

Prisma остаётся локальной SQLite-базой для профилей, новостей, событий и будущей админки. Harvest-витрина для сайта строится из JSON, чтобы локальный запуск был воспроизводимым.
