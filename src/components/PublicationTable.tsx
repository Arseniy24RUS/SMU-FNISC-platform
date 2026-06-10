'use client';

import { useMemo, useState } from 'react';
import type { NormalizedPublication, PublicationSourceKey } from '@/lib/harvest/normalise';
import type { PublicMember } from '@/lib/data/publicMembers';

export function PublicationTable({ publications, members = [] }: { publications: NormalizedPublication[]; members?: PublicMember[] }) {
  const [query, setQuery] = useState('');
  const [memberSlug, setMemberSlug] = useState('');
  const [source, setSource] = useState('');
  const [year, setYear] = useState('');
  const [indexFlag, setIndexFlag] = useState('');
  const years = useMemo(() => Array.from(new Set(publications.map((p) => p.year).filter(Boolean))).sort((a, b) => Number(b) - Number(a)), [publications]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/ё/g, 'е');
    return publications.filter((publication) => {
      const text = `${publication.title} ${publication.titleEn ?? ''} ${publication.journal ?? ''} ${publication.authorsRaw ?? ''}`.toLowerCase().replace(/ё/g, 'е');
      if (needle && !text.includes(needle)) return false;
      if (memberSlug && !publication.memberSlugs?.includes(memberSlug)) return false;
      if (source && !publication.sources.includes(source as PublicationSourceKey)) return false;
      if (year && String(publication.year ?? '') !== year) return false;
      if (indexFlag === 'vak' && !publication.isVak) return false;
      if (indexFlag === 'rinc' && !publication.sources.includes('elibrary')) return false;
      if (indexFlag === 'scopus' && !publication.sources.includes('scopus')) return false;
      if (indexFlag === 'wos' && !publication.sources.includes('wos')) return false;
      return true;
    });
  }, [indexFlag, memberSlug, publications, query, source, year]);

  function exportData(format: 'csv' | 'json') {
    const name = `smu-publications.${format}`;
    const content = format === 'json' ? JSON.stringify(filtered, null, 2) : toCsv(filtered);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!publications.length) {
    return <div className="empty-state">Публикации ещё не собраны. Запустите `pnpm harvest:all:local` или локальный запуск по двойному клику.</div>;
  }

  return (
    <>
      <div className="filter-bar" aria-label="Фильтры публикаций">
        <label>Поиск<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, журнал, автор" /></label>
        <label>Участник<select value={memberSlug} onChange={(event) => setMemberSlug(event.target.value)}>
          <option value="">Все</option>
          {members.map((member) => <option key={member.slug} value={member.slug}>{member.full_name}</option>)}
        </select></label>
        <label>Источник<select value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">Все</option>
          <option value="elibrary">РИНЦ/eLibrary</option>
          <option value="scopus">Scopus</option>
          <option value="wos">Web of Science</option>
          <option value="openalex">OpenAlex</option>
        </select></label>
        <label>Год<select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">Все</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label>Индекс<select value={indexFlag} onChange={(event) => setIndexFlag(event.target.value)}>
          <option value="">Все</option>
          <option value="vak">ВАК</option>
          <option value="rinc">РИНЦ</option>
          <option value="scopus">Scopus</option>
          <option value="wos">WoS</option>
        </select></label>
        <div className="filter-actions">
          <button className="button secondary" type="button" onClick={() => exportData('csv')}>CSV</button>
          <button className="button secondary" type="button" onClick={() => exportData('json')}>JSON</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Год</th><th>Название</th><th>Источник</th><th>Цит.</th><th>Индексы</th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.canonicalKey}>
                <td>{p.year || '-'}</td>
                <td>
                  <strong>{p.title}</strong><br />
                  <span>{p.journal || p.venue || '-'}</span>
                  {p.doi ? <><br /><a className="text-link" href={`https://doi.org/${p.doi}`}>DOI</a></> : null}
                </td>
                <td>{p.sources.join(', ')}</td>
                <td>{(p.rincCitations || 0) + (p.scopusCitations || 0) + (p.wosCitations || 0)}</td>
                <td>{[p.isVak ? 'ВАК' : '', p.sources.includes('elibrary') ? 'РИНЦ' : '', p.sources.includes('scopus') ? 'Scopus' : '', p.sources.includes('wos') ? 'WoS' : ''].filter(Boolean).join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function toCsv(publications: NormalizedPublication[]) {
  const rows = publications.map((p) => [p.year ?? '', p.title, p.journal ?? p.venue ?? '', p.sources.join('|'), p.doi ?? '']);
  return [['year', 'title', 'venue', 'sources', 'doi'], ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}
