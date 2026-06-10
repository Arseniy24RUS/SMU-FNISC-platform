# Codex App instructions for this repository

Работайте как с production-ready MVP портала Совета молодых учёных ФНИСЦ РАН: это управляемая ИТ-платформа, а не лендинг.

- Всегда используйте `pnpm` или локальный fallback `npm exec -- pnpm`.
- Перед изменениями проверяйте `docs/ARCHITECTURE.md`, `docs/DATA_CONTRACTS.md`, `docs/CAREER_RULES.md` и `docs/CODEX_TASKS.md`.
- После изменения TypeScript, Prisma, API или harvest-логики запускайте `pnpm lint`, `pnpm typecheck` и релевантные tests.
- Не ломайте локальный запуск через `ПУСК_СМУ_ФНИСЦ_РАН.cmd` и `scripts/local/start-local.ps1`.
- Не хардкодьте API-ключи и не выводите их в документацию, отчёты, клиентский JavaScript или public JSON.
- Все внешние harvest-операции должны иметь timeout, retry/diagnostics, raw/cache сохранение и graceful degradation.
- Публичные данные проверяйте на отсутствие телефонов; академический e-mail публичен, телефон непубличен.
- Новые публичные страницы должны иметь metadata/семантику, адаптивную верстку и нормальную доступность.
- Карьерные и юридические числовые критерии храните в `data/rules/*.json`, а не в React-компонентах.
