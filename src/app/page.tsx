import Image from 'next/image';
import Link from 'next/link';
import { KpiCard } from '@/components/KpiCard';
import { SectionCard } from '@/components/SectionCard';
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

const moscowInstitutes = [
  {
    acronym: 'ИС',
    name: 'Институт социологии РАН',
    focus: 'социальная структура, динамика общества, методология и история социологии'
  },
  {
    acronym: 'ИСД',
    name: 'Институт социальной демографии РАН',
    focus: 'демографическое развитие, семейная политика, поколения и социальное самочувствие'
  },
  {
    acronym: 'ИСПИ',
    name: 'Институт социально-политических исследований РАН',
    focus: 'социально-политические процессы, молодёжь, риски, гражданская и ценностная динамика'
  },
  {
    acronym: 'ИСЭПН',
    name: 'Институт социально-экономических проблем народонаселения им. Н. М. Римашевской РАН',
    focus: 'качество жизни, человеческий потенциал, благосостояние и социально-экономическое неравенство'
  }
];

const territorialNodes = [
  { number: '1', city: 'Москва', unit: 'центральная площадка и московские институты ФНИСЦ РАН' },
  { number: '2', city: 'Санкт-Петербург', unit: 'Социологический институт РАН — филиал ФНИСЦ РАН' },
  { number: '3', city: 'Симферополь', unit: 'Крымский филиал ФНИСЦ РАН' },
  { number: '4', city: 'Нальчик', unit: 'Северо-Кавказский филиал ФНИСЦ РАН' },
  { number: '5', city: 'Ростов-на-Дону', unit: 'Южно-Российский филиал ФНИСЦ РАН' }
];

const platformSections = [
  {
    title: 'Новости',
    href: '/media',
    eyebrow: 'Публичность',
    text: 'Редакционная витрина событий, выступлений, комментариев и экспертного присутствия молодых исследователей.'
  },
  {
    title: 'Мероприятия',
    href: '/events',
    eyebrow: 'Научная среда',
    text: 'Конференции, семинары, школы, заседания и другие форматы академической коммуникации.'
  },
  {
    title: 'Участники',
    href: '/members',
    eyebrow: 'Сообщество',
    text: 'Публичные профили молодых учёных, их научные интересы, институциональная принадлежность и контакты.'
  },
  {
    title: 'Публикации',
    href: '/publications',
    eyebrow: 'Результаты',
    text: 'Собранная витрина публикационной активности, пригодная для навигации, сверки и последующего развития.'
  },
  {
    title: 'Карьера',
    href: '/career',
    eyebrow: 'Траектории',
    text: 'Понятная карта академических шагов: публикации, диссертации, звания, научные школы и признание.'
  },
  {
    title: 'Меры поддержки',
    href: '/support',
    eyebrow: 'Возможности',
    text: 'Гранты, конкурсы, программы мобильности и институциональные инструменты развития молодых исследователей.'
  }
];

export default function HomePage() {
  return (
    <>
      <section className="home-hero home-shell">
        <div className="home-hero-copy">
          <span className="eyebrow">Совет молодых учёных</span>
          <h1>Молодые учёные ФНИСЦ РАН: единое исследовательское сообщество центра и филиалов</h1>
          <p className="home-hero-lead">
            СМУ ФНИСЦ РАН — профессиональная среда для молодых исследователей социальных наук, в которой
            академическая преемственность сочетается с проектной кооперацией, публичной коммуникацией и
            вниманием к индивидуальной научной траектории.
          </p>
          <div className="cta-row">
            <Link className="button" href="/members">Смотреть участников</Link>
            <Link className="button secondary" href="/support">Меры поддержки</Link>
          </div>
        </div>
        <figure className="home-hero-media">
          <Image
            className="home-hero-image"
            src={publicAssetPath('/brand/fnisc-main-building-winter.jpg')}
            alt="Главное здание ФНИСЦ РАН зимой"
            width={1600}
            height={1200}
            sizes="(max-width: 900px) 100vw, 42vw"
            priority
          />
          <figcaption>Главное здание ФНИСЦ РАН</figcaption>
        </figure>
      </section>

      <section className="home-kpis home-shell" aria-label="Ключевые характеристики СМУ ФНИСЦ РАН">
        <KpiCard label="Статус" value="СМУ" hint="профессиональное объединение молодых исследователей" />
        <KpiCard label="Профиль" value="социальные науки" hint="социология, демография, социальная политика и смежные направления" />
        <KpiCard label="Москва" value="4 института" hint="несколько научных площадок в одном городском контуре" />
        <KpiCard label="Филиальная сеть" value="4 узла" hint="Санкт-Петербург, Крым, Северный Кавказ и Юг России" />
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">Миссия</span>
          <h2>Зачем СМУ нужен федеральному академическому центру</h2>
          <p>
            Молодые учёные — это не только кадровый резерв, но и активный участник производства нового знания:
            они входят в исследовательские коллективы, осваивают современные методы, развивают межинститутские
            связи и формируют будущую повестку российских социальных наук.
          </p>
        </div>
        <div className="mission-grid">
          {missionCards.map((card) => (
            <article className="mission-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">География</span>
          <h2>Карта присутствия ФНИСЦ РАН</h2>
          <p>
            Молодые исследователи работают не только в московских институтах, но и в филиалах ФНИСЦ РАН. Поэтому
            главная страница фиксирует Совет как распределённое сообщество, объединённое общей академической
            повесткой и институциональной принадлежностью.
          </p>
        </div>
        <div className="presence-layout">
          <figure className="presence-map-card">
            <Image
              className="presence-map"
              src={publicAssetPath('/maps/fnisc-presence-map.svg')}
              alt="Карта субъектов Российской Федерации с отмеченными городами присутствия ФНИСЦ РАН"
              width={1200}
              height={620}
              sizes="(max-width: 900px) 100vw, 68vw"
              unoptimized
            />
            <figcaption>
              Карта показывает территориальные узлы присутствия; московские институты раскрыты отдельным
              структурным блоком, поскольку находятся в одном городе, но представляют разные исследовательские
              направления.
            </figcaption>
          </figure>
          <aside className="presence-note" aria-label="Расшифровка карты">
            <h3>Узлы присутствия</h3>
            <div className="presence-list">
              {territorialNodes.map((node) => (
                <div className="presence-item" key={node.number}>
                  <span>{node.number}</span>
                  <div>
                    <strong>{node.city}</strong>
                    <p>{node.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">Структура</span>
          <h2>Как устроено институциональное поле СМУ</h2>
          <p>
            Для публичной страницы важно разделить два уровня: московские институты ФНИСЦ РАН, которые визуально
            трудно развести на общефедеральной карте, и филиальную сеть, задающую территориальную широту Совета.
          </p>
        </div>
        <div className="structure-grid">
          <article className="structure-card structure-card--accent">
            <span className="structure-label">Московский контур</span>
            <h3>Институты ФНИСЦ РАН в Москве</h3>
            <div className="unit-list">
              {moscowInstitutes.map((unit) => (
                <div className="unit-row" key={unit.acronym}>
                  <strong>{unit.acronym}</strong>
                  <div>
                    <h4>{unit.name}</h4>
                    <p>{unit.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="structure-card">
            <span className="structure-label">Филиальная сеть</span>
            <h3>Территориальные площадки</h3>
            <p>
              Филиалы расширяют исследовательскую оптику ФНИСЦ РАН: они связывают федеральную повестку с
              региональными обществами, локальными данными, научными школами и экспертными коммуникациями.
            </p>
            <div className="branch-list">
              {territorialNodes.slice(1).map((node) => (
                <div key={node.city}>
                  <strong>{node.city}</strong>
                  <span>{node.unit}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="home-section home-shell">
        <div className="home-section-heading">
          <span className="eyebrow">Платформа</span>
          <h2>Публичная витрина СМУ ФНИСЦ РАН</h2>
          <p>
            Сайт должен работать как устойчивая информационная страница Совета и как навигация по живым разделам:
            участникам, событиям, публикациям, карьерным ориентирам и мерам поддержки.
          </p>
        </div>
        <div className="grid">
          {platformSections.map((section) => (
            <SectionCard key={section.href} title={section.title} href={section.href} eyebrow={section.eyebrow}>
              <p>{section.text}</p>
            </SectionCard>
          ))}
        </div>
      </section>
    </>
  );
}
