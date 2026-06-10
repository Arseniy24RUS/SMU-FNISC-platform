const { readFile, access } = await import('node:fs/promises');
const { existsSync } = await import('node:fs');
const { join } = await import('node:path');

type Member = { slug: string; full_name: string; email?: string; public_emails?: string[]; institute?: string; photo_url?: string };
type Publication = { canonicalKey?: string; title?: string; year?: number; sources?: string[]; doi?: string };
type SupportMeasure = {
  id?: string;
  category?: string;
  title?: string;
  status2026?: string;
  amount?: string;
  deadline?: string;
  who?: string;
  exactCriteria?: string[];
  legalDescription?: string[];
  documents?: string[];
  whereToApply?: string[];
  links?: Array<{ title?: string; url?: string; type?: string }>;
};
type CareerItem = {
  memberSlug: string;
  milestones?: Array<{
    key?: string;
    layer?: string;
    track?: string;
    parallel_track?: string;
    join_gate?: boolean;
    legal_basis?: string[];
    graph_node?: boolean;
    details_group?: string;
  }>;
};

const root = process.cwd();
const failures: string[] = [];

async function main() {
  const seed = await readJson<Member[]>(join(root, 'data', 'seeds', 'members.public.json'), []);
  const members = await readJson<Member[]>(join(root, 'data', 'public', 'members.json'), []);
  const publications = await readJson<Publication[]>(join(root, 'data', 'public', 'publications.json'), []);
  const supportMeasures = await readJson<SupportMeasure[]>(join(root, 'data', 'public', 'support-measures.json'), []);
  const career = await readJson<CareerItem[]>(join(root, 'data', 'public', 'career-map.json'), []);

  must(existsSync(join(root, 'data', 'public', 'harvest-report.json')), 'data/public/harvest-report.json is missing');
  must(existsSync(join(root, 'public', 'generated', 'harvest-summary.json')), 'public/generated/harvest-summary.json is missing');
  must(members.length > 0, 'data/public/members.json is empty');
  must(supportMeasures.length > 0, 'data/public/support-measures.json is empty');

  const publicText = await readCombinedPublicJson();
  must(!containsPhoneLikeValue(publicText), 'public JSON contains phone-like private contact values');
  await checkPhotoManifests();

  for (const seedMember of seed) {
    const member = members.find((item) => item.slug === seedMember.slug);
    must(Boolean(member), `member missing from public data: ${seedMember.slug}`);
    if (!member) continue;
    must(Boolean(member.slug && member.full_name && member.institute), `member has missing core fields: ${member.slug}`);
    const seedEmail = seedMember.email || seedMember.public_emails?.[0];
    if (seedEmail) must(member.email === seedEmail || Boolean(member.public_emails?.includes(seedEmail)), `public email missing for ${member.slug}`);
    if (member.photo_url) await checkPhoto(member.photo_url, member.slug);
  }

  for (const publication of publications) {
    must(Boolean(publication.title && publication.year && publication.sources?.length), `publication has missing title/year/source: ${publication.canonicalKey ?? publication.title ?? 'unknown'}`);
  }

  for (const measure of supportMeasures) {
    must(Boolean(measure.id && measure.category && measure.title && measure.status2026), `support measure has missing core fields: ${measure.id ?? measure.title ?? 'unknown'}`);
    must(Boolean(measure.amount && measure.deadline && measure.who), `support measure has missing public summary fields: ${measure.id ?? measure.title ?? 'unknown'}`);
    must(Boolean(measure.exactCriteria?.length), `support measure has no exact criteria: ${measure.id ?? measure.title ?? 'unknown'}`);
    must(Boolean(measure.legalDescription?.length), `support measure has no legal description: ${measure.id ?? measure.title ?? 'unknown'}`);
    must(Boolean(measure.documents?.length), `support measure has no document list: ${measure.id ?? measure.title ?? 'unknown'}`);
    must(Boolean(measure.whereToApply?.length), `support measure has no application route: ${measure.id ?? measure.title ?? 'unknown'}`);
    must(Boolean(measure.links?.length), `support measure has no official links: ${measure.id ?? measure.title ?? 'unknown'}`);
    for (const link of measure.links ?? []) {
      must(Boolean(link.title && link.url && link.type), `support measure has incomplete link: ${measure.id ?? measure.title ?? 'unknown'}`);
    }
  }

  const seenDoi = new Set<string>();
  const seenTitleYear = new Set<string>();
  for (const publication of publications) {
    const doi = publication.doi?.toLowerCase();
    if (doi) {
      must(!seenDoi.has(doi), `duplicate DOI: ${doi}`);
      seenDoi.add(doi);
    }
    const titleYear = `${publication.title?.toLowerCase().replace(/\s+/g, ' ').trim()}::${publication.year ?? ''}`;
    if (publication.title && publication.year) {
      must(!seenTitleYear.has(titleYear), `duplicate title+year: ${publication.title}`);
      seenTitleYear.add(titleYear);
    }
  }

  const careerSlugs = new Set(career.map((item) => item.memberSlug));
  for (const member of members) must(careerSlugs.has(member.slug), `career-map missing for ${member.slug}`);
  for (const item of career) {
    const keys = new Set((item.milestones ?? []).map((milestone) => milestone.key));
    must(keys.has('doctor_degree'), `career-map missing doctor branch for ${item.memberSlug}`);
    must(keys.has('docent_title'), `career-map missing docent branch for ${item.memberSlug}`);
    must(keys.has('professor_join_gate'), `career-map missing professor join gate for ${item.memberSlug}`);
    must(Boolean(item.milestones?.some((milestone) => milestone.parallel_track === 'doctor')), `career-map missing parallel doctor track for ${item.memberSlug}`);
    must(Boolean(item.milestones?.some((milestone) => milestone.parallel_track === 'docent')), `career-map missing parallel docent track for ${item.memberSlug}`);
    must(Boolean(item.milestones?.some((milestone) => milestone.layer === 'academy_track')), `career-map missing academy track for ${item.memberSlug}`);
    must(Boolean(item.milestones?.every((milestone) => milestone.legal_basis?.length)), `career-map has milestone without legal_basis for ${item.memberSlug}`);
    const graphKeys = new Set((item.milestones ?? []).filter((milestone) => milestone.graph_node).map((milestone) => milestone.key));
    for (const key of ['master_or_specialist', 'postgraduate_or_attachment', 'candidate_degree', 'doctor_degree', 'docent_title', 'professor_title']) {
      must(graphKeys.has(key), `career-map graph missing major node ${key} for ${item.memberSlug}`);
    }
    must(!graphKeys.has('candidate_publication_minimum'), `career-map graph should not expose candidate publication minimum as node for ${item.memberSlug}`);
    must(!graphKeys.has('docent_publications_and_editions'), `career-map graph should not expose docent criteria as node for ${item.memberSlug}`);
    must(Boolean(item.milestones?.some((milestone) => milestone.key === 'professor_join_gate' && milestone.details_group === 'professor_title')), `professor gate should be grouped under professor title for ${item.memberSlug}`);
  }

  const careerRulesText = existsSync(join(root, 'data', 'rules', 'career-rules.json'))
    ? await readFile(join(root, 'data', 'rules', 'career-rules.json'), 'utf-8')
    : '';
  must(!careerRulesText.includes('1139'), 'career rules still reference obsolete decree 1139');

  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Public data audit passed: members=${members.length}, publications=${publications.length}`);
  }
}

function must(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function readCombinedPublicJson() {
  const files = ['members.json', 'publications.json', 'scientometrics.json', 'career-map.json', 'media-mentions.json', 'harvest-report.json', 'support-measures.json', 'member-photo-manifest.json'];
  const chunks = await Promise.all(files.map(async (file) => {
    const path = join(root, 'data', 'public', file);
    return existsSync(path) ? readFile(path, 'utf-8') : '';
  }));
  return chunks.join('\n');
}

async function checkPhotoManifests() {
  const paths = [
    join(root, 'data', 'public', 'member-photo-manifest.json'),
    join(root, 'data', 'seeds', 'member-photo-manifest.json')
  ];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const text = await readFile(path, 'utf-8');
    must(!containsPhoneLikeValue(text), `${path} contains phone-like private contact values`);
    must(!text.includes('"context"'), `${path} contains raw HTML context snippets`);
  }
}

function containsPhoneLikeValue(text: string) {
  return /(\+7\s*\(?\d{3}\)?|\b8\s*800\b|\(\d{3}\)\s*\d{3}|\b(?:телефон|phone|mobile|моб\.)\b\s*[:=])/i.test(text);
}

async function checkPhoto(photoUrl: string, slug: string) {
  if (!photoUrl.startsWith('/')) return;
  const path = join(root, 'public', photoUrl);
  try {
    await access(path);
  } catch {
    failures.push(`photo_url does not exist for ${slug}: ${photoUrl}`);
  }
}

main();

export {};
