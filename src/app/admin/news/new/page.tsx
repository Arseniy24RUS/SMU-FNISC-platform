import { PressReleaseDraftForm } from '@/components/PressReleaseDraftForm';

export default function AdminNewsNewPage() {
  return (
    <section className="page">
      <div className="page-title">
        <h1>Новый пресс-релиз</h1>
        <p>Загрузите программу PDF/DOCX и фотографии. Система создаст JSON-черновик для проверки редактором.</p>
      </div>
      <div className="grid wide">
        <article className="news-card">
          <PressReleaseDraftForm />
        </article>
      </div>
    </section>
  );
}
