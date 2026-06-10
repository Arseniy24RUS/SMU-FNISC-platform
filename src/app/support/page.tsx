import type { Metadata } from 'next';
import { getSupportMeasuresData, type LinkItem, type SupportCategory, type SupportMeasure } from '@/lib/data/publicData';

export const metadata: Metadata = {
  title: 'Меры поддержки молодых учёных | СМУ ФНИСЦ РАН',
  description:
    'Сроки, суммы, критерии и официальные ссылки по действующим в 2026 году мерам поддержки молодых учёных в России.'
};

const verifiedAt = '9 июня 2026 года';

const categoryOrder: SupportCategory[] = [
  'Жилищная поддержка',
  'Гранты на исследования',
  'Премии и признание',
  'Инновационные проекты',
  'Внутриорганизационная поддержка'
];

const categoryAnchors: Record<SupportCategory, string> = {
  'Жилищная поддержка': 'housing',
  'Гранты на исследования': 'research-grants',
  'Премии и признание': 'awards',
  'Инновационные проекты': 'innovation',
  'Внутриорганизационная поддержка': 'fnisc-internal'
};

function DetailsBlock({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="support-details" open={open}>
      <summary>{title}</summary>
      {children}
    </details>
  );
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="support-measure-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SourceLinks({ links }: { links: LinkItem[] }) {
  return (
    <div className="support-source-links">
      {links.map((link) => (
        <a href={link.url} key={`${link.type}-${link.url}`} target="_blank" rel="noreferrer" className="support-source-link">
          <span>{link.type}</span>
          <strong>{link.title}</strong>
          <small>{link.url}</small>
        </a>
      ))}
    </div>
  );
}

function MeasureCard({ measure }: { measure: SupportMeasure }) {
  return (
    <article className="support-measure-card" id={measure.id}>
      <div className="support-card-topline">
        <span className="support-category-pill">{measure.category}</span>
        <strong>{measure.status2026}</strong>
      </div>
      <h3>{measure.title}</h3>

      <div className="support-fact-grid" aria-label="Ключевые параметры меры поддержки">
        <div>
          <span>Сумма</span>
          <p>{measure.amount}</p>
        </div>
        <div>
          <span>Сроки</span>
          <p>{measure.deadline}</p>
        </div>
        <div>
          <span>Кто может участвовать</span>
          <p>{measure.who}</p>
        </div>
      </div>

      <DetailsBlock title="Точные критерии" open>
        <ItemList items={measure.exactCriteria} />
      </DetailsBlock>
      <DetailsBlock title="Юридически точное описание">
        <ItemList items={measure.legalDescription} />
      </DetailsBlock>
      <DetailsBlock title="Документы">
        <ItemList items={measure.documents} />
      </DetailsBlock>
      <DetailsBlock title="Куда обращаться">
        <ItemList items={measure.whereToApply} />
      </DetailsBlock>
      <DetailsBlock title="Официальные ссылки и нормативные акты">
        <SourceLinks links={measure.links} />
      </DetailsBlock>
    </article>
  );
}

export default async function SupportPage() {
  const measures = await getSupportMeasuresData();
  const categories = categoryOrder.filter((category) => measures.some((measure) => measure.category === category));

  return (
    <section className="page support-page">
      <div className="page-title support-title">
        <span className="eyebrow">СМУ ФНИСЦ РАН · актуально на {verifiedAt}</span>
        <h1>Меры поддержки молодых учёных</h1>
        <p>
          Сроки, суммы, точные названия программ, критерии участия и официальные ссылки на нормативные акты, положения
          конкурсов и страницы подачи заявок.
        </p>
        <div className="support-meta" aria-label="Сводка справочника">
          <span>{measures.length} мер поддержки</span>
          <span>{categories.length} разделов</span>
          <span>2026 год</span>
        </div>
      </div>

      <nav className="support-nav" aria-label="Категории мер поддержки">
        <h2>Категории</h2>
        <div>
          {categories.map((category) => (
            <a href={`#${categoryAnchors[category]}`} key={category}>
              {category}
            </a>
          ))}
        </div>
      </nav>

      <section className="support-quick-table" aria-labelledby="support-quick-table-title">
        <h2 id="support-quick-table-title">Краткая таблица</h2>
        <div className="support-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Мера</th>
                <th>Сумма</th>
                <th>Сроки</th>
                <th>Ключевой критерий</th>
              </tr>
            </thead>
            <tbody>
              {measures.map((measure) => (
                <tr key={measure.id}>
                  <td>
                    <a href={`#${measure.id}`}>{measure.title}</a>
                  </td>
                  <td>{measure.amount}</td>
                  <td>{measure.deadline}</td>
                  <td>{measure.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {categories.map((category) => {
        const categoryMeasures = measures.filter((measure) => measure.category === category);
        return (
          <section className="support-category-section" id={categoryAnchors[category]} key={category} aria-labelledby={`${categoryAnchors[category]}-title`}>
            <h2 id={`${categoryAnchors[category]}-title`}>{category}</h2>
            <div className="support-card-list">
              {categoryMeasures.map((measure) => (
                <MeasureCard key={measure.id} measure={measure} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="support-method-note">
        <h2>Что проверять перед подачей</h2>
        <p>
          Для денежных грантов и премий сначала проверяйте дату окончания приёма заявок, возраст на дату выдвижения или
          подачи заявки, допустимость коллективной заявки, требования к выдвигающему органу и перечень документов. Для
          жилищных мер отдельно проверяйте нуждаемость, стаж, учёную степень, место работы и то, куда именно подаётся
          первичное заявление: по месту работы, через ДОМ.РФ, через РНФ, через Фонд содействия инновациям или через сайт
          премии.
        </p>
      </section>
    </section>
  );
}
