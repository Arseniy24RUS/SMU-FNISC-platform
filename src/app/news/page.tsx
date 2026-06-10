import { PressReleaseDraftForm } from '@/components/PressReleaseDraftForm';

export default function NewsPage() {
  return (
    <section className="page">
      <div className="page-title">
        <h1>Новости и пресс-релизы</h1>
        <p>Раздел рассчитан на редакционный цикл: загрузка программы, извлечение фактов, генерация черновика, проверка, публикация. Фотографии прикладываются пользователем и получают подписи, но не генерируются.</p>
      </div>
      <div className="grid wide">
        <article className="news-card">
          <span className="eyebrow">LLM-черновик</span>
          <h2>Создать пресс-релиз по программе мероприятия</h2>
          <PressReleaseDraftForm />
        </article>
        <article className="news-card">
          <span className="eyebrow">Шаблон</span>
          <h2>Структура результата</h2>
          <p>Заголовок, лид с датой и площадкой, абзац о модераторе и темах, последовательное изложение докладов, дискуссия, итоговый абзац, подписи к фото, список фактов для проверки.</p>
          <p>API возвращает JSON, чтобы админка могла открыть черновик для редактирования, а не публиковать автоматически.</p>
        </article>
      </div>
    </section>
  );
}
