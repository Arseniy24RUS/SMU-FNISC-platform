# Release checklist

- [x] Windows double-click entrypoint добавлен: `ПУСК_СМУ_ФНИСЦ_РАН.cmd`.
- [x] PowerShell bootstrap добавлен: `scripts/local/start-local.ps1`.
- [x] Локальный harvest пишет `data/local`, `data/public`, `public/generated`.
- [x] Официальный логотип ФНИСЦ РАН сохранён в `public/brand`.
- [x] Публичные страницы читают `data/public`.
- [x] Admin harvest page добавлена: `/admin/harvest`.
- [x] Audit public data добавлен: `pnpm audit:public-data`.
- [x] Локальный релиз готов к ручной проверке после зелёных `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
