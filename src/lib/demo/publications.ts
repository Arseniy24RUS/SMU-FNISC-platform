import type { NormalizedPublication } from '@/lib/harvest/normalise';

export const demoPublications: NormalizedPublication[] = [
  {
    canonicalKey: 'demo:1',
    title: 'Демографические установки молодых семей Московского региона',
    year: 2026,
    journal: 'Социологические исследования',
    rincCitations: 0,
    scopusCitations: 0,
    sources: ['elibrary', 'scopus'],
    isVak: true,
    vakSpecialties: ['5.4.4']
  },
  {
    canonicalKey: 'demo:2',
    title: 'Миграционные процессы и пространственное развитие населения',
    year: 2025,
    journal: 'Народонаселение',
    sources: ['elibrary', 'wos'],
    isVak: true,
    vakSpecialties: ['5.2.3']
  },
  {
    canonicalKey: 'demo:3',
    title: 'Методы визуализации карьерных траекторий молодых учёных',
    year: 2026,
    venue: 'Материалы конференции молодых учёных',
    sources: ['manual'],
    isVak: false
  }
];
