const demoEvents = [
  { title: 'Семинар молодых исследователей ФНИСЦ РАН', date: '2026-09-18', place: 'Москва / гибридно', tag: 'семинар' },
  { title: 'Конференция молодых учёных: социальная динамика России', date: '2026-10-22', place: 'ФНИСЦ РАН', tag: 'конференция' },
  { title: 'Мастерская карьерных траекторий', date: '2026-11-12', place: 'онлайн', tag: 'карьера' }
];

export default function EventsPage() {
  return (
    <section className="page">
      <div className="page-title"><h1>Мероприятия</h1><p>Календарь должен стать источником для новостей: после завершения события программа и фото превращаются в черновик пресс-релиза.</p></div>
      <div className="grid">
        {demoEvents.map((event) => (
          <article className="event-card" key={event.title}>
            <span className="eyebrow">{event.tag}</span>
            <h2>{event.title}</h2>
            <p>{new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p>{event.place}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
