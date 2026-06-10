export type CareerGraphStatus = 'LOCKED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_VERIFICATION' | string;

export type CareerGraphMilestone = {
  key: string;
  label: string;
  layer?: string;
  track?: string;
  parallel_track?: string;
  join_gate?: boolean;
  order?: number;
  description?: string;
  legal_basis?: string[];
  evidence_required?: string[];
  manual_verification?: boolean;
  status: CareerGraphStatus;
  progress?: { current: number; target: number; percent: number; label: string };
  progressItems?: Array<{ key: string; label: string; current: number | null; target: number; percent: number; status: string }>;
  nextActions?: string[];
  graph_node?: boolean;
  graph_track?: CareerGraphTrack;
  graph_order?: number;
  graph_label?: string;
  details_group?: string;
};

export type CareerGraphTrack = 'base' | 'doctor' | 'docent' | 'professor' | 'academy';

export type CareerGraphNode = CareerGraphMilestone & {
  graph_track: CareerGraphTrack;
  graph_order: number;
  graph_label: string;
  groupedMilestones: CareerGraphMilestone[];
};

const NODE_META: Record<string, { graph_track: CareerGraphTrack; graph_order: number; graph_label: string }> = {
  master_or_specialist: { graph_track: 'base', graph_order: 10, graph_label: 'Магистр / специалист' },
  postgraduate_or_attachment: { graph_track: 'base', graph_order: 20, graph_label: 'Аспирантура / прикрепление' },
  candidate_degree: { graph_track: 'base', graph_order: 30, graph_label: 'Кандидат наук' },
  doctor_degree: { graph_track: 'doctor', graph_order: 40, graph_label: 'Доктор наук' },
  docent_title: { graph_track: 'docent', graph_order: 40, graph_label: 'Доцент' },
  professor_title: { graph_track: 'professor', graph_order: 50, graph_label: 'Профессор' },
  ras_professor: { graph_track: 'academy', graph_order: 60, graph_label: 'Профессор РАН' },
  ras_corresponding_member: { graph_track: 'academy', graph_order: 70, graph_label: 'Член-корреспондент РАН' },
  ras_academician: { graph_track: 'academy', graph_order: 80, graph_label: 'Академик РАН' }
};

const DETAILS_GROUP: Record<string, string> = {
  candidate_exams: 'candidate_degree',
  candidate_publication_minimum: 'candidate_degree',
  candidate_dissertation_defense: 'candidate_degree',
  doctor_topic: 'doctor_degree',
  doctor_publication_minimum: 'doctor_degree',
  doctor_dissertation_council: 'doctor_degree',
  doctor_dissertation_defense: 'doctor_degree',
  docent_position_and_load: 'docent_title',
  docent_experience: 'docent_title',
  docent_publications_and_editions: 'docent_title',
  docent_attestation_case: 'docent_title',
  professor_join_gate: 'professor_title',
  professor_position_and_load: 'professor_title',
  professor_experience: 'professor_title',
  professor_publications_training: 'professor_title',
  professor_attestation_case: 'professor_title'
};

export function decorateCareerMilestone<T extends CareerGraphMilestone>(milestone: T): T {
  const meta = NODE_META[milestone.key];
  return {
    ...milestone,
    graph_node: milestone.graph_node ?? Boolean(meta),
    graph_track: milestone.graph_track ?? meta?.graph_track,
    graph_order: milestone.graph_order ?? meta?.graph_order,
    graph_label: milestone.graph_label ?? meta?.graph_label,
    details_group: milestone.details_group ?? DETAILS_GROUP[milestone.key] ?? (meta ? milestone.key : undefined)
  };
}

export function buildCareerGraph(milestones: CareerGraphMilestone[]) {
  const decorated = milestones.map(decorateCareerMilestone);
  const groups = new Map<string, CareerGraphMilestone[]>();

  for (const milestone of decorated) {
    const groupKey = milestone.details_group;
    if (!groupKey) continue;
    const group = groups.get(groupKey) ?? [];
    group.push(milestone);
    groups.set(groupKey, group);
  }

  const graphNodes: CareerGraphNode[] = decorated
    .filter((milestone) => milestone.graph_node && milestone.graph_track && milestone.graph_order != null && milestone.graph_label)
    .map((milestone) => ({
      ...milestone,
      graph_track: milestone.graph_track as CareerGraphTrack,
      graph_order: milestone.graph_order as number,
      graph_label: milestone.graph_label as string,
      groupedMilestones: [...(groups.get(milestone.key) ?? [milestone])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }))
    .sort((a, b) => a.graph_order - b.graph_order);

  return { milestones: decorated, graphNodes };
}

export function isGraphMilestone(key: string) {
  return Boolean(NODE_META[key]);
}
