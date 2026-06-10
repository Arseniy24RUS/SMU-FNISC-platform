# Карта источников и интеграций

## Personal website repository

Целевые элементы для переноса:

`build_public_data.py`: логика объединения публикаций, локализованных полей, дедупликации и сводной наукометрии.

`harvest_elibrary_profile.py`, `harvest_elibrary_items.py`, `harvest_elibrary_authors_route.py`: eLibrary/РИНЦ с fallback на снимки и отчёты качества.

`harvest_scopus.py`: Scopus Author Retrieval/Search API, метрики и список работ.

`harvest_wos_author_profile_*`: Web of Science profile records и метрики.

`harvest_media_mentions.py`: Google News RSS, seed URLs, sitemap scanning, Telegram public pages, scoring/deduplication.

`.github/workflows/refresh-data.yml`: weekly cron, OpenVPN/proxy/cookie support, публикация JSON/TSV и audit stamp.

## External APIs

OpenAI Responses API: генерация JSON-черновиков, поддержка текстовых и файловых/визуальных сценариев через API.

Google Gemini API: потенциальный бесплатный/условно бесплатный провайдер для прототипа.

Scopus APIs: авторский профиль, поиск работ, цитирования; нужен ключ Elsevier и соблюдение условий доступа.

Web of Science API: Clarivate API с подпиской/ключом; для free-view нужен осторожный браузерный сбор с fallback, если это допустимо вашим доступом.

OpenAlex/ORCID/Crossref: открытые вспомогательные источники для DOI, метаданных, англоязычных названий и проверки дублей.

Google News RSS/sitemap/Telegram: бесплатный слой СМИ-мониторинга, но с ограниченной полнотой и необходимостью модерации.


## Новые локальные утилиты

`src/lib/loadEnv.ts` загружает `.env.local` и `.env` для standalone-скриптов `tsx`, чтобы локальная проверка Scopus работала так же, как Next.js dev server.

`scripts/fetch-member-photos.ts` скачивает фотографии с профильных страниц и обновляет `data/seeds/member-photo-manifest.json`.

`scripts/test-scopus.ts` выполняет smoke-test Scopus Search API по Author ID и сохраняет результат в `data/generated/scopus-test/`.
