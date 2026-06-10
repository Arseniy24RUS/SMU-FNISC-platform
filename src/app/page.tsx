import Image from 'next/image';
import Link from 'next/link';
import { KpiCard } from '@/components/KpiCard';
import { PresenceMapViewer } from '@/components/PresenceMapViewer';
import { publicAssetPath } from '@/lib/deploy';

const missionCards = [
  {
    title: 'Научная преемственность',
    text: 'СМУ соединяет ранние этапы академической карьеры с опытом научных школ ФНИСЦ РАН, помогает молодым исследователям входить в коллективные проекты, семинары, конференции и экспертные обсуждения.'
  },
  {
    title: 'Проектная кооперация',
    text: 'Совет создаёт горизонтальные связи между лабораториями, институтами и филиалами: от совместных заявок и полевых исследований до обмена методическими решениями и данными.'
  },
  {
    title: 'Публикационная культура',
    text: 'Площадка поддерживает видимость результатов молодых учёных, аккуратно связывает публикации, медиаприсутствие и карьерные траектории, не подменяя экспертную оценку формальными метриками.'
  },
  {
    title: 'Публичная коммуникация науки',
    text: 'Молодые исследователи участвуют в переводе академического знания на язык общества, органов управления, образовательных программ и публичной дискуссии о социальных изменениях.'
  }
];

const territorialNodes = [
  { number: '1', city: 'Москва', unit: 'центральная площадка и московские институты ФНИСЦ РАН' },
  { number: '2', city: 'Санкт-Петербург', unit: 'Социологический институт РАН — филиал ФНИСЦ РАН' },
  { number: '3', city: 'Симферополь', unit: 'Крымский филиал ФНИСЦ РАН' },
  { number: '4', city: 'Нальчик', unit: 'Северо-Кавказский филиал ФНИСЦ РАН' },
  { number: '5', city: 'Ростов-на-Дону', unit: 'Южно-Российский филиал ФНИСЦ РАН' }
];

const structureUnits = [
  { city: 'Москва', acronym: 'ФНИСЦ РАН', name: 'Федеральный научно-исследовательский социологический центр РАН', role: 'головная организация, объединяющая исследовательские направления и филиальную сеть', logo: '/brand/fnisc-logo.png', href: 'https://www.fnisc.ru/' },
  { city: 'Москва', acronym: 'ИС', name: 'Институт социологии ФНИСЦ РАН', role: 'социальная структура, динамика общества, методология и история социологии', logo: '/brand/units/institute-sociology.png', href: 'https://www.isras.ru/' },
  { city: 'Москва', acronym: 'ИСД', name: 'Институт социальной демографии ФНИСЦ РАН', role: 'демографическое развитие, семейная политика, поколения и социальное самочувствие', logo: '/brand/units/social-demography.png', href: 'https://isd-ras.ru/' },
  { city: 'Москва', acronym: 'ИСПИ', name: 'Институт социально-политических исследований ФНИСЦ РАН', role: 'социально-политические процессы, молодёжь, риски, гражданская и ценностная динамика', logo: '/brand/units/ispi.png', href: 'https://испи.рф/' },
  { city: 'Москва', acronym: 'ИСЭПН', name: 'Институт социально-экономических проблем народонаселения имени Н. М. Римашевской ФНИСЦ РАН', role: 'качество жизни, человеческий потенциал, благосостояние и социально-экономическое неравенство', logo: '/brand/units/isepn.png', href: 'https://www.isesp-ras.ru/' },
  { city: 'Санкт-Петербург', acronym: 'СИ РАН', name: 'Социологический институт РАН — филиал ФНИСЦ РАН', role: 'социологические исследования, научная школа и экспертная повестка Северо-Запада', logo: '/brand/units/sociological-institute.png', href: 'https://socinst.ru/' },
  { city: 'Симферополь', acronym: 'Крымский филиал', name: 'Крымский филиал ФНИСЦ РАН', role: 'региональная исследовательская площадка ФНИСЦ РАН в Крыму', logo: '/brand/fnisc-logo.png', href: 'https://www.fnisc.ru/index.php?page_id=2522' },
  { city: 'Нальчик', acronym: 'Северо-Кавказский филиал', name: 'Северо-Кавказский филиал ФНИСЦ РАН', role: 'региональная исследовательская площадка ФНИСЦ РАН на Северном Кавказе', logo: '/brand/fnisc-logo.png', href: 'https://www.fnisc.ru/index.php?page_id=2522' },
  { city: 'Ростов-на-Дону', acronym: 'Южно-Российский филиал', name: 'Южно-Российский филиал ФНИСЦ РАН', role: 'региональная исследовательская площадка ФНИСЦ РАН на Юге России', logo: '/brand/fnisc-logo.png', href: 'https://www.fnisc.ru/index.php?page_id=2522' }
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero home-shell">
        <div className="home-hero-copy">
          <span className="eyebrow">Совет молодых учёных</span>
          <h1>Молодые учёные ФНИСЦ РАН: единое исследовательское сообщество центра и филиалов</h1>
          <p className="home-hero-lead">СМУ ФНИСЦ РАН — профессиональная среда для молодых исследователей социальных наук, в которой академическая преемственность сочетается с проектной кооперацией, публичной коммуникацией и вниманием к индивидуальной научной траектории.</p>
          <div className="cta-row">
            <Link className="button" href="/members">Смотреть участников</Link>
            <Link className="button secondary" href="/support">Меры поддержки</Link>
          </div>
        </div>
        <figure className="home-hero-media">
          <Image className="home-hero-image" src={publicAssetPath('/brand/fnisc-main-building-winter.jpg')} alt="Главное здание ФНИСЦ РАН зимой" width={1600} height={1200} sizes="(max-width: 900px) 100vw, 42vw" priority />
          <figcaption>Главное здание ФНИСЦ РАН</figcaption>
        </figure>
      </section>

      <section className="home-kpis home-shell" aria-label="Ключевые характеристики СМУ ФНИСЦ РАН">
        <KpiCard label="Статус" value="СМУ" hint="профессиональное объединение молодых исследователей" />
        <KpiCard label="Профиль" value="социальные науки" hint="социология, демография, социальная политика и смежные направления" />
        <KpiCard label="География" value="5 городов" hint="Москва, Санкт-Петербург, Симферополь, Нальчик и Ростов-на-Дону" />
        <KpiCard label="Структура" value="9 узлов" hint="центр, институты и филиалы в едином поле СМУ" />
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">Миссия</span>
          <h2>Зачем СМУ нужен федеральному академическому центру</h2>
          <p>Молодые учёные — это не только кадровый резерв, но и активный участник производства нового знания: они входят в исследовательские коллективы, осваивают современные методы, развивают межинститутские связи и формируют будущую повестку российских социальных наук.</p>
        </div>
        <div className="mission-grid">
          {missionCards.map((card) => <article className="mission-card" key={card.title}><h3>{card.title}</h3><p>{card.text}</p></article>)}
        </div>
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">География</span>
          <h2>Карта присутствия ФНИСЦ РАН</h2>
          <p>Молодые исследователи работают не только в московских институтах, но и в филиалах ФНИСЦ РАН. Поэтому главная страница фиксирует Совет как распределённое сообщество, объединённое общей академической повесткой и институциональной принадлежностью.</p>
        </div>
        <div className="presence-layout">
          <PresenceMapViewer />
          <aside className="presence-note" aria-label="Расшифровка карты">
            <h3>Узлы присутствия</h3>
            <div className="presence-list">
              {territorialNodes.map((node) => <div className="presence-item" key={node.number}><span>{node.number}</span><div><strong>{node.city}</strong><p>{node.unit}</p></div></div>)}
            </div>
          </aside>
        </div>
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">Структура</span>
          <h2>Институты и филиалы ФНИСЦ РАН в едином списке</h2>
          <p>СМУ формируется внутри общей институциональной рамки ФНИСЦ РАН: московские институты, головной центр и территориальные филиалы образуют единое пространство научной коммуникации, кадрового развития и проектного взаимодействия молодых исследователей.</p>
        </div>
        <article className="structure-card structure-card--list">
          <div className="structure-unit-list">
            {structureUnits.map((unit) => (
              <article className="structure-unit-row" key={`${unit.city}-${unit.acronym}`}>
                <a className="structure-unit-logo-link" href={unit.href} target="_blank" rel="noreferrer" aria-label={`Открыть официальный сайт: ${unit.name}`}>
                  <Image src={publicAssetPath(unit.logo)} alt={`Логотип: ${unit.name}`} width={160} height={160} sizes="96px" unoptimized />
                </a>
                <div className="structure-unit-copy"><span className="structure-unit-city">{unit.city}</span><h4><a href={unit.href} target="_blank" rel="noreferrer">{unit.name}</a></h4><p>{unit.role}</p><small>{unit.acronym}</small></div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <style>{`
        .structure-card--list { padding: clamp(18px, 3vw, 28px); }
        .structure-unit-list { display: grid; gap: 14px; }
        .structure-unit-row { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 18px; align-items: start; padding: 18px 0; border-top: 1px solid #edf1f6; }
        .structure-unit-row:first-child { padding-top: 0; border-top: 0; }
        .structure-unit-row:last-child { padding-bottom: 0; }
        .structure-unit-logo-link { display: grid; place-items: center; width: 96px; height: 96px; padding: 10px; border: 1px solid rgba(184, 164, 108, .32); border-radius: var(--radius-md); background: white; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
        .structure-unit-logo-link:hover { border-color: rgba(41, 109, 193, .45); box-shadow: var(--shadow-soft); transform: translateY(-1px); }
        .structure-unit-logo-link img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .structure-unit-copy { min-width: 0; }
        .structure-unit-city { display: inline-flex; min-height: 24px; align-items: center; padding: 0 8px; border-radius: var(--radius-sm); background: var(--brand-pale); color: var(--brand-red); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .structure-unit-copy h4 { margin: 10px 0 7px; color: var(--brand-navy); font-size: 18px; line-height: 1.25; }
        .structure-unit-copy h4 a:hover { color: var(--brand-blue); }
        .structure-unit-copy p { margin: 0; max-width: 760px; color: #475467; font-size: 15px; line-height: 1.55; }
        .structure-unit-copy small { display: inline-flex; margin-top: 12px; color: var(--muted); font-size: 12px; font-weight: 800; }
        @media (max-width: 640px) { .structure-unit-row { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
