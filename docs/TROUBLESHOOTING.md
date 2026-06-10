# Troubleshooting

## `pnpm` не найден

Запустите через `.cmd` или используйте:

```bash
npm exec -- pnpm install
```

## eLibrary не отдаёт страницу

Проверьте `data/public/harvest-report.json`. Если указан captcha/anti-bot, локальный MVP сохранит warning и продолжит работу. Cookie для CI/production настраивается позже.

## WoS не отдаёт записи

Без API-ключа выполняется free-view попытка. Если WoS не раскрывает записи в HTML, статус будет `нужен API-доступ или ручной cache`.

## Scopus 401/403/429

Проверьте наличие `SCOPUS_API_KEY` в `.env.local`, лимиты подписки и `data/local/diagnostics/scopus-test`.

## Сайт пустой

Запустите:

```bash
pnpm harvest:all:local
pnpm audit:public-data
```
