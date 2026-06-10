import { IS_GITHUB_PAGES } from '@/lib/deploy';

export function PressReleaseDraftForm() {
  if (IS_GITHUB_PAGES) {
    return (
      <div className="upload-box readonly-panel">
        <strong>Генерация черновика доступна в локальном Node-режиме.</strong>
        <p>GitHub Pages публикует статическую витрину без серверных `/api` маршрутов. Код LLM-черновика, загрузки PDF/DOCX и модерации сохранён в репозитории для локального запуска.</p>
        <code>pnpm dev</code>
      </div>
    );
  }

  return (
    <form className="upload-box" action="/api/llm/generate-press-release" method="post" encType="multipart/form-data">
      <label>Название мероприятия<input name="eventTitle" placeholder="Например: Расширенное заседание Научного совета РАН" /></label>
      <label>Дата и место<input name="eventMeta" placeholder="8 июня 2026 года, Ялта" /></label>
      <label>Программа PDF/DOCX<input name="program" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /></label>
      <label>Фотографии<input name="photos" type="file" accept="image/*" multiple /></label>
      <label>Редакционные уточнения<textarea name="editorialNote" placeholder="Что обязательно упомянуть, кого не забыть, какой тон нужен" /></label>
      <button className="button" type="submit">Сгенерировать черновик</button>
    </form>
  );
}

