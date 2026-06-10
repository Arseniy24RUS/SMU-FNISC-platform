'use client';

import { useMemo, useState } from 'react';
import { MemberCard } from '@/components/MemberCard';
import type { PublicMember } from '@/lib/data/publicMembers';

export function MemberDirectory({ members }: { members: PublicMember[] }) {
  const [query, setQuery] = useState('');
  const [institute, setInstitute] = useState('');
  const [degree, setDegree] = useState('');
  const [identifier, setIdentifier] = useState('');
  const institutes = useMemo(() => Array.from(new Set(members.map((member) => member.institute).filter(Boolean))).sort(), [members]);
  const degrees = useMemo(() => Array.from(new Set(members.map((member) => member.degree_status).filter(Boolean))).sort(), [members]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/ё/g, 'е');
    return members.filter((member) => {
      const ids = member.identifiers ?? {};
      const text = `${member.full_name} ${member.institute ?? ''} ${member.position ?? ''} ${member.interests ?? ''}`.toLowerCase().replace(/ё/g, 'е');
      if (needle && !text.includes(needle)) return false;
      if (institute && member.institute !== institute) return false;
      if (degree && member.degree_status !== degree) return false;
      if (identifier && !ids[identifier]) return false;
      return true;
    });
  }, [degree, identifier, institute, members, query]);

  function exportCsv() {
    const csv = [['full_name', 'institute', 'position', 'degree_status', 'email'], ...filtered.map((member) => [member.full_name, member.institute ?? '', member.position ?? '', member.degree_status ?? '', member.email ?? member.public_emails?.[0] ?? ''])]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smu-members.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="filter-bar" aria-label="Фильтры состава СМУ">
        <label>Поиск<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ФИО, институт, интересы" /></label>
        <label>Институт<select value={institute} onChange={(event) => setInstitute(event.target.value)}>
          <option value="">Все</option>
          {institutes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label>Степень<select value={degree} onChange={(event) => setDegree(event.target.value)}>
          <option value="">Все</option>
          {degrees.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label>Идентификатор<select value={identifier} onChange={(event) => setIdentifier(event.target.value)}>
          <option value="">Любой</option>
          <option value="elibrary_author_id">РИНЦ</option>
          <option value="scopus_author_id">Scopus</option>
          <option value="wos_researcher_id">WoS</option>
          <option value="orcid">ORCID</option>
        </select></label>
        <div className="filter-actions"><button className="button secondary" type="button" onClick={exportCsv}>CSV</button></div>
      </div>
      <div className="grid wide">
        {filtered.map((member) => <MemberCard key={member.slug} member={member} />)}
      </div>
    </>
  );
}
