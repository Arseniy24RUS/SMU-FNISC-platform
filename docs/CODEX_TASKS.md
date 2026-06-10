# Очередь задач для Codex App

## Этап 1. Довести MVP до запуска

Проверить `pnpm install`, `pnpm prisma:generate`, `pnpm prisma:migrate`, `pnpm seed`, `pnpm build`. Исправить несовместимости версий Next/React/Prisma, если появятся. Добавить `.env.local` и проверить локальный режим LLM.

## Этап 2. Админка

Сделать страницы `/admin/news`, `/admin/members`, `/admin/publications`, `/admin/career`, `/admin/media`. Добавить таблицы, фильтры, формы проверки и статусы модерации. Реализовать сохранение `NewsDraft` и `PressReleaseAsset` в базу.

## Этап 3. Авторизация

Добавить вход по e-mail allowlist. Для членов СМУ: claim profile через РИНЦ AuthorID + подтверждение администратором. Для редакторов: роль `EDITOR`; для руководителя — `ADMIN`.

## Этап 4. Наукометрия

Перенести из personal-website полноразмерные парсеры eLibrary, Web of Science free-view и медиамониторинга. Сохранить логи доступа и fallback к последнему валидному снимку. Не использовать обход ограничений; работать через разрешённый доступ, cookies/API и кеширование.

## Этап 5. Карьера

Импортировать актуальный перечень ВАК-специальностей и журналов. Добавить ручную модерацию публикаций: тип публикации, ВАК, специальности, учебное издание, связь с диссертационной темой. Сделать heatmap-дэшборд руководителя СМУ.

## Этап 6. Production

Перейти на PostgreSQL, MinIO/S3 для фото, cron/queue worker, rate limiting, backup, audit log, Sentry/логирование, privacy policy, регламент публикации и согласия на обработку персональных данных.


## Очередь после текущего патча

1. Запустить `pnpm scopus:test` и `pnpm sync:publications` в локальной сети; проверить, какие члены СМУ имеют Scopus Author ID и где нужны ручные/автоматические сопоставления.
2. Запустить `pnpm photos:fetch`; просмотреть `data/seeds/member-photo-manifest.json`, вручную проверить спорные фото и при необходимости закрепить `photo_source_url`.
3. После проверки фотографий включить их в карточки как `photo_status=downloaded`; SVG-аватары оставить fallback.
4. Расширить `fetchFniscProfileIdentifiers` так, чтобы он обновлял недостающие РИНЦ/SPIN/ORCID/WoS/Scopus из профильных страниц при наличии доступа.
