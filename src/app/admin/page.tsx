import { AdminActionCard } from '@/components/AdminActionCard';

export default function AdminPage() {
  return (
    <section className="page">
      <div className="page-title"><h1>Админ-панель</h1><p>Черновая панель для Codex-доработки: запуск сборщиков, генерация новостей, модерация и проверка карьерных milestone.</p></div>
      <div className="grid">
        <AdminActionCard title="Синхронизировать публикации" description="Запускает adapters eLibrary, Scopus, WoS, OpenAlex и пересчитывает сводную статистику." action="POST /api/sync/publications" />
        <AdminActionCard title="Harvest status" description="Локальные сборщики, raw/cache/report и ручной запуск задач." action="/admin/harvest" />
        <AdminActionCard title="Обновить СМИ" description="Ищет упоминания членов СМУ в RSS, sitemap и Telegram-источниках." action="POST /api/sync/media" />
        <AdminActionCard title="Сгенерировать пресс-релиз" description="Принимает PDF/DOCX программы и фото, возвращает JSON-черновик новости." action="POST /api/llm/generate-press-release" />
        <AdminActionCard title="Новый пресс-релиз" description="Demo uploader программы и фотографий для редакционного черновика." action="/admin/news/new" />
        <AdminActionCard title="Проверить карьерные карты" description="Считает статьи ВАК, учебные издания, стаж преподавания и следующие действия." action="POST /api/career/evaluate" />
      </div>
    </section>
  );
}
