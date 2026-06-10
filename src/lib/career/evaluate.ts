import { yearsBetween } from '@/lib/utils';
import type { NormalizedPublication } from '@/lib/harvest/normalise';

export type CareerMilestoneStatus = 'LOCKED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_VERIFICATION';
export type CareerLayer = 'degree' | 'academic_title' | 'academy_track';
export type ProfileMetricKey = 'candidate_publications_by_specialty' | 'doctor_publications_total';
export type CareerMetricKey =
  | 'teaching_years'
  | 'scientific_pedagogical_years'
  | 'continuous_position_years'
  | 'pedagogical_load_fraction'
  | 'works_total'
  | 'educational_editions_total'
  | 'educational_editions_recent_3y'
  | 'educational_editions_recent_5y'
  | 'scientific_works_recent_3y'
  | 'scientific_works_recent_5y'
  | 'docent_title_age_years'
  | 'textbook_or_manuals_10y'
  | 'supervised_defenses_university'
  | 'supervised_defenses_research'
  | 'age_limit_years'
  | 'ras_research_experience_years';

export type CareerRule = {
  key: string;
  label: string;
  layer?: CareerLayer;
  track: string;
  parallel_track?: 'doctor' | 'docent';
  join_gate?: boolean;
  order: number;
  description: string;
  requires?: string[];
  legal_basis?: string[];
  evidence_required?: string[];
  manual_verification?: boolean;
  profile_metric?: ProfileMetricKey;
  metrics?: Partial<Record<CareerMetricKey, number>>;
  graph_node?: boolean;
  graph_track?: 'base' | 'doctor' | 'docent' | 'professor' | 'academy';
  graph_order?: number;
  graph_label?: string;
  details_group?: string;
};

export type CareerProfile = {
  label: string;
  description?: string;
  enabled?: boolean;
  metrics?: Partial<Record<ProfileMetricKey, number>>;
};

export type CareerRules = {
  version: string;
  updated_at?: string;
  default_profile?: string;
  disclaimer?: string;
  profiles?: Record<string, CareerProfile>;
  milestones: CareerRule[];
};

export type CareerOverrideInput = { milestoneKey: string; status: CareerMilestoneStatus; value?: unknown };
export type TeachingPeriod = { startsAt: string | Date; endsAt?: string | Date | null };
export type CareerInput = {
  publications: NormalizedPublication[];
  teachingPeriods?: TeachingPeriod[];
  overrides?: CareerOverrideInput[];
  academicDegree?: string | null;
  academicTitle?: string | null;
  docentAwardedAt?: string | Date | null;
  profileKey?: string | null;
  evaluationDate?: string | Date;
};

export type CareerProgressItem = {
  key: string;
  label: string;
  current: number | null;
  target: number;
  percent: number;
  status: 'met' | 'missing' | 'manual';
};

export type CareerMilestoneEvaluation = CareerRule & {
  status: CareerMilestoneStatus;
  progress?: { current: number; target: number; percent: number; label: string };
  progressItems?: CareerProgressItem[];
  nextActions: string[];
  matchedSpecialties?: Array<{ code: string; count: number }>;
};
export type CareerEvaluation = {
  generatedAt: string;
  teachingYears: number;
  profileKey: string;
  profileLabel?: string;
  milestones: CareerMilestoneEvaluation[];
};

const CREDENTIAL_MILESTONES = new Set([
  'candidate_degree',
  'doctor_degree',
  'docent_title',
  'professor_title',
  'ras_professor',
  'ras_corresponding_member',
  'ras_academician'
]);

const METRIC_LABELS: Record<CareerMetricKey, string> = {
  teaching_years: 'лет педагогического стажа',
  scientific_pedagogical_years: 'лет научно-педагогического стажа',
  continuous_position_years: 'лет непрерывной работы в должности',
  pedagogical_load_fraction: 'доля педагогической нагрузки',
  works_total: 'учебных изданий и научных трудов всего',
  educational_editions_total: 'учебных изданий',
  educational_editions_recent_3y: 'учебных изданий за последние 3 года',
  educational_editions_recent_5y: 'учебных изданий за последние 5 лет',
  scientific_works_recent_3y: 'научных трудов за последние 3 года',
  scientific_works_recent_5y: 'научных трудов за последние 5 лет',
  docent_title_age_years: 'лет после присвоения звания доцента',
  textbook_or_manuals_10y: 'учебник или комплект учебных пособий за последние 10 лет',
  supervised_defenses_university: 'защитившихся под научным руководством для вузов',
  supervised_defenses_research: 'защитившихся под научным руководством для научных организаций',
  age_limit_years: 'предельный возраст по положению РАН',
  ras_research_experience_years: 'лет работы в системе РАН'
};

const MANUAL_METRICS = new Set<CareerMetricKey>([
  'scientific_pedagogical_years',
  'continuous_position_years',
  'pedagogical_load_fraction',
  'textbook_or_manuals_10y',
  'supervised_defenses_university',
  'supervised_defenses_research',
  'age_limit_years',
  'ras_research_experience_years'
]);

export function evaluateCareer(input: CareerInput, rules: CareerRules): CareerEvaluation {
  const now = input.evaluationDate ? new Date(input.evaluationDate) : new Date();
  const completed = new Set<string>();
  const satisfied = new Set<string>();
  const overrides = new Map((input.overrides ?? []).map((o) => [o.milestoneKey, o]));
  const teachingYears = (input.teachingPeriods ?? []).reduce(
    (sum, p) => sum + yearsBetween(new Date(p.startsAt), p.endsAt ? new Date(p.endsAt) : now),
    0
  );
  addKnownCredentials(completed, input);
  for (const key of completed) satisfied.add(key);

  const profileKey = input.profileKey || rules.default_profile || 'social_humanitarian';
  const profile = rules.profiles?.[profileKey] ?? rules.profiles?.[rules.default_profile ?? ''] ?? rules.profiles?.social_humanitarian;
  const snapshot = buildMetricSnapshot(input.publications, teachingYears, input.docentAwardedAt, now);
  const vakBySpecialty = countVakBySpecialty(input.publications);
  const sorted = [...rules.milestones].sort((a, b) => a.order - b.order);
  const evaluated: CareerMilestoneEvaluation[] = [];

  for (const rule of sorted) {
    const override = overrides.get(rule.key);
    if (override?.status === 'COMPLETED') {
      completed.add(rule.key);
      satisfied.add(rule.key);
    }

    const depsDone = (rule.requires ?? []).every((key) => satisfied.has(key));
    let status: CareerMilestoneStatus = depsDone ? 'IN_PROGRESS' : 'LOCKED';
    const nextActions: string[] = [];
    let progress: CareerMilestoneEvaluation['progress'];
    const progressItems: CareerProgressItem[] = [];
    let matchedSpecialties: CareerMilestoneEvaluation['matchedSpecialties'];

    if (rule.profile_metric) {
      const result = evaluateProfileMetric(rule.profile_metric, profile, vakBySpecialty, snapshot);
      progressItems.push(result.item);
      progress = result.progress;
      if (result.matchedSpecialties) matchedSpecialties = result.matchedSpecialties;
      status = metricStatus(depsDone, progressItems, Boolean(rule.manual_verification));
      pushMetricAction(nextActions, result.item);
      if (matchedSpecialties?.length) {
        nextActions.push(`Потенциальные специальности защиты: ${matchedSpecialties.map((x) => `${x.code} (${x.count})`).join(', ')}.`);
      }
    }

    if (rule.metrics) {
      for (const [key, target] of Object.entries(rule.metrics) as Array<[CareerMetricKey, number]>) {
        const item = buildMetricProgress(key, target, snapshot);
        progressItems.push(item);
        pushMetricAction(nextActions, item);
      }
      progress = progress ?? summarizeProgress(progressItems);
      status = metricStatus(depsDone, progressItems, Boolean(rule.manual_verification));
    }

    if (!rule.profile_metric && !rule.metrics && rule.manual_verification) {
      status = depsDone ? 'NEEDS_VERIFICATION' : 'LOCKED';
      nextActions.push('Подтвердить документально и зафиксировать статус в профиле.');
    }

    if (CREDENTIAL_MILESTONES.has(rule.key)) {
      if (completed.has(rule.key)) {
        status = 'COMPLETED';
      } else if (depsDone) {
        status = rule.key.startsWith('ras_') ? 'NEEDS_VERIFICATION' : 'READY';
        nextActions.push('Проверить формальные требования, собрать подтверждающие документы и зафиксировать milestone в профиле.');
      }
    }

    if (override?.status === 'COMPLETED') status = 'COMPLETED';
    if (override && override.status !== 'COMPLETED') status = override.status;
    if (status === 'COMPLETED' || (override?.status === 'COMPLETED')) {
      completed.add(rule.key);
      satisfied.add(rule.key);
    } else if (status === 'READY' && satisfiesDependenciesWhenReady(rule)) {
      satisfied.add(rule.key);
    }

    evaluated.push({
      ...rule,
      status,
      progress,
      progressItems: progressItems.length ? progressItems : undefined,
      nextActions: unique(nextActions),
      matchedSpecialties
    });
  }

  return {
    generatedAt: now.toISOString(),
    teachingYears,
    profileKey,
    profileLabel: profile?.label,
    milestones: evaluated
  };
}

function addKnownCredentials(completed: Set<string>, input: CareerInput) {
  const degree = normalizeCredentialText(input.academicDegree);
  const title = normalizeCredentialText(`${input.academicTitle ?? ''} ${input.academicDegree ?? ''}`);
  if (degree.includes('к.') || degree.includes('кандидат')) completed.add('candidate_degree');
  if (degree.includes('д.') || degree.includes('доктор')) {
    completed.add('candidate_degree');
    completed.add('doctor_degree');
  }
  if (title.includes('доцент')) completed.add('docent_title');
  if (title.includes('профессор ран')) completed.add('ras_professor');
  if (title.includes('профессор') && !title.includes('профессор ран')) completed.add('professor_title');
}

function normalizeCredentialText(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildMetricSnapshot(publications: NormalizedPublication[], teachingYears: number, docentAwardedAt: CareerInput['docentAwardedAt'], now: Date) {
  const educational = publications.filter((p) => p.type === 'educational_edition');
  const scientific = publications.filter((p) => p.type !== 'educational_edition');
  const totalIndexed = publications.filter((p) => p.isVak || p.sources.includes('scopus') || p.sources.includes('wos')).length;
  return {
    publications,
    totalWorks: publications.length,
    totalIndexed,
    educationalEditions: educational.length,
    scientificWorks: scientific.length,
    teachingYears,
    docentTitleAgeYears: docentAwardedAt ? yearsBetween(new Date(docentAwardedAt), now) : null,
    recentEducationalEditions3y: countRecent(educational, 3, now),
    recentEducationalEditions5y: countRecent(educational, 5, now),
    recentScientificWorks3y: countRecent(scientific, 3, now),
    recentScientificWorks5y: countRecent(scientific, 5, now)
  };
}

function evaluateProfileMetric(
  metric: ProfileMetricKey,
  profile: CareerProfile | undefined,
  vakBySpecialty: Record<string, number>,
  snapshot: ReturnType<typeof buildMetricSnapshot>
) {
  const target = profile?.metrics?.[metric] ?? (metric === 'candidate_publications_by_specialty' ? 3 : 15);
  if (metric === 'candidate_publications_by_specialty') {
    const current = Math.max(0, ...Object.values(vakBySpecialty));
    const matchedSpecialties = Object.entries(vakBySpecialty)
      .filter(([, count]) => count >= target)
      .map(([code, count]) => ({ code, count }));
    const item = makeProgressItem(metric, 'публикаций ВАК по одной научной специальности', current, target);
    return {
      item,
      progress: { current, target, percent: item.percent, label: item.label },
      matchedSpecialties
    };
  }
  const item = makeProgressItem(metric, 'профильных публикаций для докторской диссертации', snapshot.totalIndexed, target);
  return { item, progress: { current: snapshot.totalIndexed, target, percent: item.percent, label: item.label } };
}

function buildMetricProgress(key: CareerMetricKey, target: number, snapshot: ReturnType<typeof buildMetricSnapshot>): CareerProgressItem {
  if (MANUAL_METRICS.has(key)) return makeProgressItem(key, METRIC_LABELS[key], null, target);
  const current = metricValue(key, snapshot);
  return makeProgressItem(key, METRIC_LABELS[key], current, target);
}

function metricValue(key: CareerMetricKey, snapshot: ReturnType<typeof buildMetricSnapshot>): number | null {
  switch (key) {
    case 'teaching_years':
      return Number(snapshot.teachingYears.toFixed(1));
    case 'works_total':
      return snapshot.totalWorks;
    case 'educational_editions_total':
      return snapshot.educationalEditions;
    case 'educational_editions_recent_3y':
      return snapshot.recentEducationalEditions3y;
    case 'educational_editions_recent_5y':
      return snapshot.recentEducationalEditions5y;
    case 'scientific_works_recent_3y':
      return snapshot.recentScientificWorks3y;
    case 'scientific_works_recent_5y':
      return snapshot.recentScientificWorks5y;
    case 'docent_title_age_years':
      return snapshot.docentTitleAgeYears == null ? null : Number(snapshot.docentTitleAgeYears.toFixed(1));
    default:
      return null;
  }
}

function makeProgressItem(key: string, label: string, current: number | null, target: number): CareerProgressItem {
  const percent = current == null ? 0 : Math.min(100, (current / target) * 100);
  return {
    key,
    label,
    current,
    target,
    percent,
    status: current == null ? 'manual' : current >= target ? 'met' : 'missing'
  };
}

function metricStatus(depsDone: boolean, items: CareerProgressItem[], manualVerification: boolean): CareerMilestoneStatus {
  if (!depsDone) return 'LOCKED';
  if (items.some((item) => item.status === 'missing')) return 'IN_PROGRESS';
  if (items.some((item) => item.status === 'manual') || manualVerification) return 'NEEDS_VERIFICATION';
  return 'READY';
}

function summarizeProgress(items: CareerProgressItem[]) {
  const known = items.filter((item) => item.current != null);
  if (!known.length) return undefined;
  if (known.length === 1) {
    const [item] = known;
    return { current: item.current ?? 0, target: item.target, percent: item.percent, label: item.label };
  }
  const current = known.filter((item) => item.status === 'met').length;
  const target = known.length;
  return { current, target, percent: (current / target) * 100, label: 'автоматически проверяемых критериев закрыто' };
}

function satisfiesDependenciesWhenReady(rule: CareerRule) {
  return Boolean(rule.profile_metric || rule.metrics || rule.join_gate);
}

function pushMetricAction(actions: string[], item: CareerProgressItem) {
  if (item.status === 'met') return;
  if (item.status === 'manual') {
    actions.push(`Подтвердить вручную: ${item.label} (порог: ${formatTarget(item.target)}).`);
    return;
  }
  actions.push(`Добрать ${formatTarget(item.target - (item.current ?? 0))}: ${item.label}.`);
}

function formatTarget(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function countRecent(publications: NormalizedPublication[], years: number, now: Date) {
  const startYear = now.getFullYear() - years + 1;
  return publications.filter((publication) => (publication.year ?? 0) >= startYear).length;
}

function countVakBySpecialty(publications: NormalizedPublication[]) {
  const counts: Record<string, number> = {};
  for (const p of publications) {
    if (!p.isVak) continue;
    for (const code of p.vakSpecialties?.length ? p.vakSpecialties : ['unspecified']) counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
