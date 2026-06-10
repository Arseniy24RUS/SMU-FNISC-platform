# Локальный запуск

## Двойной клик

Откройте `ПУСК_СМУ_ФНИСЦ_РАН.cmd`. Скрипт проверит Node.js/npm/pnpm, установит зависимости, выполнит Prisma, seed, локальный harvest и откроет `http://localhost:3000`.

Если окно показывает ошибку, оно не закрывается: прочитайте последний блок лога и файл в `data/local/logs/`.

## Если нет Node.js

Установите Node.js LTS с `https://nodejs.org/`, затем снова запустите `.cmd`.

## `.env.local`

Файл уже используется для локальных секретов. Ключи Scopus, Gemini, WoS и cookie eLibrary должны быть только там или в переменных окружения. Значения не пишутся в отчёты.

## Полный harvest

```bash
pnpm harvest:all:local
```

Повторить только источник:

```bash
pnpm harvest:elibrary:local
pnpm harvest:scopus:local
pnpm harvest:wos:local
pnpm harvest:media:local
```

## Где результаты

- raw: `data/local/harvest/<timestamp>/raw/`
- последний cache: `data/local/latest/`
- публичная витрина: `data/public/`
- краткая сводка: `public/generated/harvest-summary.json`

## Как понять статус источника

Откройте `data/public/harvest-report.json` или `/admin/harvest`.

Статусы:

- `получено`
- `частично получено`
- `источник недоступен`
- `нужен cookie/API-доступ`
- `использован cache`

## WoS/eLibrary

В локальном режиме сначала выполняется прямой запрос с вашего ПК. Cookie/API-доступ нужен только если источник сам не отдаёт данные или требует авторизацию.

## Локальный сайт

После запуска откройте `http://localhost:3000`.
