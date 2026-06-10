# Локальный harvest

`pnpm harvest:all:local` запускает последовательный сбор eLibrary, Scopus, WoS, OpenAlex, СМИ и публикацию фото-манифеста.

## Контур данных

1. Raw сохраняется в `data/local/harvest/<timestamp>/raw/<source>/<memberSlug>/`.
2. Нормализованные снимки сохраняются в `data/local/harvest/<timestamp>/normalized/`.
3. Последний валидный cache копируется в `data/local/latest/`.
4. Публичные JSON пишутся в `data/public/`.
5. UI summary пишется в `public/generated/harvest-summary.json`.

## Источники

- eLibrary: AuthorID из `data/seeds/members.public.json`, windows-1251/utf-8 decoding, polite delay, raw HTML.
- Scopus: `SCOPUS_API_KEY` из env, пагинация works, raw JSON страниц.
- WoS: `WOS_API_KEY` или `CLARIVATE_WOS_API_KEY`; без ключа выполняется free-view попытка и честный report/cache fallback.
- Media: Google News RSS по вариантам ФИО и контекстным словам.

## Ограничения

Сборщики не обходят captcha, paywall или технические ограничения. Если источник не отдаёт данные локально, статус фиксируется в `harvest-report.json`, а сайт продолжает работать.
