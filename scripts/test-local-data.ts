const { normalizeDoi, normalizeTitle, mergePublicationSets } = await import('../src/lib/harvest/normalise');
const { buildScientometricSummary } = await import('../src/lib/harvest/scientometrics');
const { evaluateCareer } = await import('../src/lib/career/evaluate');
const { buildCareerGraph } = await import('../src/lib/career/graph');
const { loadCareerRules } = await import('../src/lib/career/rules');
const { extractImageCandidates } = await import('../src/lib/harvest/photos');

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const doi = normalizeDoi('https://doi.org/10.1234/ABC.');
assert(doi === '10.1234/abc', 'normalizeDoi should strip DOI URL and punctuation');
assert(normalizeTitle('Ёжик: тест!') === 'ежик тест', 'normalizeTitle should normalize Cyrillic text');

const publications = mergePublicationSets(
  [{ canonicalKey: 'doi:10.1/a', title: 'Test Article', year: 2026, doi: '10.1/a', sources: ['scopus'], scopusCitations: 3, memberSlugs: ['a'] }],
  [{ canonicalKey: 'title-year:test article:2026', title: 'Test Article', year: 2026, doi: '10.1/a', sources: ['wos'], wosCitations: 5, memberSlugs: ['a'] }]
);

assert(publications.length === 1, 'mergePublicationSets should deduplicate by DOI');
assert(publications[0].sources.includes('scopus') && publications[0].sources.includes('wos'), 'mergePublicationSets should merge sources');

const summary = buildScientometricSummary(publications);
assert(summary.total_publications === 1, 'summary should count total publications');
assert(summary.scopus_total === 1 && summary.wos_total === 1, 'summary should count source totals');

const rules = await loadCareerRules();
const socialCandidate = evaluateCareer({
  publications: [vakPub(1), vakPub(2), vakPub(3)],
  profileKey: 'social_humanitarian',
  overrides: [{ milestoneKey: 'master_or_specialist', status: 'COMPLETED' }],
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(socialCandidate, 'candidate_publication_minimum') === 'READY', 'social-humanitarian candidate threshold should be 3 VAK publications');

const generalCandidate = evaluateCareer({
  publications: [vakPub(1), vakPub(2)],
  profileKey: 'general',
  overrides: [{ milestoneKey: 'master_or_specialist', status: 'COMPLETED' }],
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(generalCandidate, 'candidate_publication_minimum') === 'READY', 'general candidate threshold should be configurable to 2 VAK publications');

const candidateWithDocent = evaluateCareer({
  publications: [],
  academicDegree: 'кандидат наук, доцент',
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(candidateWithDocent, 'docent_title') === 'COMPLETED', 'docent title should be separate from doctor degree');
assert(statusOf(candidateWithDocent, 'doctor_degree') !== 'COMPLETED', 'docent title should not imply doctor degree');

const doctorWithoutDocent = evaluateCareer({
  publications: [],
  academicDegree: 'доктор наук',
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(doctorWithoutDocent, 'professor_join_gate') === 'LOCKED', 'professor gate should require both doctor degree and docent title');

const doctorDocentTooEarly = evaluateCareer({
  publications: [],
  academicDegree: 'доктор наук, доцент',
  docentAwardedAt: '2025-06-08',
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(doctorDocentTooEarly, 'professor_join_gate') === 'IN_PROGRESS', 'professor gate should wait 3 years after docent title');

const doctorDocentReady = evaluateCareer({
  publications: [],
  academicDegree: 'доктор наук, доцент',
  docentAwardedAt: '2020-06-08',
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(doctorDocentReady, 'professor_join_gate') === 'READY', 'professor gate should open after doctor degree, docent title and 3 years');

const graph = buildCareerGraph(socialCandidate.milestones);
const graphKeys = graph.graphNodes.map((node) => node.key);
assert(graphKeys.includes('candidate_degree') && graphKeys.includes('doctor_degree') && graphKeys.includes('docent_title'), 'career graph should include major split milestones');
assert(!graphKeys.includes('candidate_publication_minimum') && !graphKeys.includes('docent_publications_and_editions'), 'career graph should hide detailed criteria from graph nodes');
assert(Boolean(graph.graphNodes.find((node) => node.key === 'candidate_degree')?.groupedMilestones.some((milestone) => milestone.key === 'candidate_publication_minimum')), 'candidate details should include candidate publication minimum');
assert(Boolean(graph.graphNodes.find((node) => node.key === 'professor_title')?.groupedMilestones.some((milestone) => milestone.key === 'professor_join_gate')), 'professor details should include hidden join gate');

const doctorOnlyForRan = evaluateCareer({
  publications: [],
  academicDegree: 'доктор наук',
  evaluationDate: '2026-06-08'
}, rules);
assert(statusOf(doctorOnlyForRan, 'ras_professor') === 'NEEDS_VERIFICATION', 'RAN professor should open to manual verification after doctor degree');
assert(statusOf(doctorOnlyForRan, 'ras_corresponding_member') === 'LOCKED', 'corresponding member contour should require professor RAN in this product model');

const photoCandidates = extractImageCandidates(`
  <img src=https://www.isras.ru/dreamedit/foto/97272C2A_9284_71D1_C071_C58CA570516B_b.jpg hspace=20 width=180 height=240 align=left alt='Ивченкова Мария Сергеевна'>
  <img src="/assets/images/logo_2024.png" alt="ФНИСЦ РАН">
  <img data-src="/dreamedit/foto/none.jpg" alt="нет фото">
`, 'https://www.fnisc.ru/pers_about.html?id=581', 'Ивченкова Мария Сергеевна');
assert(photoCandidates[0]?.url.includes('dreamedit/foto/97272C2A'), 'photo parser should find unquoted FNISC portrait src');
assert(photoCandidates.some((candidate) => candidate.url.includes('logo_2024.png') && candidate.rejected), 'photo parser should reject logos');
assert(photoCandidates.some((candidate) => candidate.url.includes('none.jpg') && candidate.rejected), 'photo parser should reject none.jpg');

console.log('Local data tests passed');

function vakPub(index: number) {
  return {
    canonicalKey: `manual:vak-${index}`,
    title: `VAK publication ${index}`,
    year: 2026,
    isVak: true,
    vakSpecialties: ['5.4.4'],
    sources: ['manual' as const]
  };
}

function statusOf(evaluation: ReturnType<typeof evaluateCareer>, key: string) {
  return evaluation.milestones.find((milestone) => milestone.key === key)?.status;
}

export {};
