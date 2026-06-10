# Контракты данных

## Публичный участник СМУ

`data/seeds/members.public.json` содержит только публично допустимые академические поля.

```json
{
  "slug": "sitkovskiy-arseniy-mihaylovich",
  "full_name": "Ситковский Арсений Михайлович",
  "email": "omnistat@yandex.ru",
  "public_emails": ["omnistat@yandex.ru"],
  "institute": "Институт социальной демографии ФНИСЦ РАН",
  "unit": "",
  "position": "Младший научный сотрудник",
  "degree_status": "без указания степени",
  "interests": "демография; миграционные процессы; пространственный анализ населения",
  "identifiers": {
    "elibrary_author_id": "1012909",
    "orcid": "0000-0002-8725-6580",
    "wos_researcher_id": "AAG-1530-2021",
    "scopus_author_id": "57220956828"
  },
  "fnisc_profile_url": "https://www.fnisc.ru/pers_about.html?id=2472",
  "photo_url": "/members/photos/sitkovskiy-arseniy-mihaylovich.svg",
  "photo_status": "placeholder",
  "photo_source_profile_url": "https://www.fnisc.ru/pers_about.html?id=2472"
}
```

Публичные поля включают академический e-mail, потому что он выводится в карточке участника и используется для связи. Приватные поля — телефоны, даты рождения, служебные комментарии — не входят в публичный seed. Для закрытой админки используйте `data/seeds/members.private.local.template.csv`; файл не должен попадать в публичный репозиторий.

## Публикация

Каноническая публикация описывается типом `NormalizedPublication`. Обязательные поля: `canonicalKey`, `title`, `sources`. Желательные поля: `year`, `doi`, `elibraryItemId`, `scopusEid`, `wosUid`, `journal`, `citations`, `isVak`, `vakSpecialties`.

`canonicalKey` строится по приоритету: `elibrary:<id>`, затем `doi:<doi>`, затем `title-year:<normalized-title>:<year>`.

## Черновик новости

LLM API возвращает строгий JSON:

```json
{
  "title": "...",
  "slug": "...",
  "lead": "...",
  "body_html": "<p>...</p>",
  "seo_description": "...",
  "photo_captions": ["..."],
  "facts_to_verify": ["..."]
}
```

`body_html` санитизируется. Разрешены только `p`, `strong`, `em`, `ul`, `li`.

## Career evaluation

На вход `evaluateCareer` получает публикации, педагогические периоды, сведения о степени/звании, профиль отрасли науки, дату присвоения доцента при наличии и ручные override. На выходе — список milestone со статусом `LOCKED`, `IN_PROGRESS`, `READY`, `COMPLETED`, `NEEDS_VERIFICATION`, прогрессом и next actions.

Публичная `career-map.json` может содержать у milestone дополнительные поля: `layer`, `parallel_track`, `join_gate`, `legal_basis`, `evidence_required`, `manual_verification`, `progressItems`, `graph_node`, `graph_track`, `graph_order`, `graph_label`, `details_group`.

`graph_node=true` означает, что milestone рисуется как крупный узел публичной схемы. Остальные условия этапа группируются через `details_group` и показываются в боковой панели выбранного узла. React-компоненты не хранят числовые юридические критерии.


## Фотография участника

`photo_status=placeholder` означает, что пока используется локальная SVG-заглушка. После `pnpm photos:fetch` или стадии `photos` в `pnpm harvest:all:local` статус становится `downloaded`, `photo_url` указывает на локальный `.jpg/.png/.webp`, а `photo_source_url` хранит исходный URL изображения на профильной странице.

Фото-harvest должен сохранять diagnostics/raw в `data/local/photo-harvest/<timestamp>/` или `data/local/harvest/<timestamp>/raw/photos/`. Если официальный источник не содержит валидного портрета, статус остаётся `not_found` или `error` с диагностикой; public JSON не должен содержать приватные телефоны.

Публичные/seed photo manifest содержат только безопасные поля кандидатов (`url`, `score`, `source`, `rejected`). HTML-контекст, raw-страницы и другие диагностические фрагменты сохраняются только в `data/local`, чтобы в публичный репозиторий не попадали телефоны или служебные контакты из внешних страниц.
