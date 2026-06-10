'use client';

import Image from 'next/image';
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  Crown,
  GraduationCap,
  Landmark,
  ScrollText,
  Trophy,
  UsersRound,
  type LucideIcon
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildCareerGraph, type CareerGraphNode } from '@/lib/career/graph';
import type { CareerMapMember } from '@/lib/data/publicData';
import type { PublicMember } from '@/lib/data/publicMembers';
import { publicAssetPath } from '@/lib/deploy';

type Milestone = CareerMapMember['milestones'][number];

const STATUS_META: Record<string, { label: string; short: string }> = {
  COMPLETED: { label: 'Завершено', short: 'готово' },
  READY: { label: 'Можно оформлять', short: 'готово' },
  IN_PROGRESS: { label: 'В процессе', short: 'в работе' },
  NEEDS_VERIFICATION: { label: 'Нужна проверка', short: 'проверка' },
  LOCKED: { label: 'Заблокировано', short: 'закрыто' }
};

const LEGAL_LABELS: Record<string, string> = {
  degree_award_rules: 'ПП РФ №842',
  academic_title_rules_1746: 'ПП РФ №1746',
  vak_specialties: 'ВАК / специальность',
  ras_professor_2025: 'Положение РАН №99/актуальные изменения',
  ras_membership_rules: 'Устав РАН / выборы членов РАН'
};

const STATUS_ORDER = ['COMPLETED', 'READY', 'IN_PROGRESS', 'NEEDS_VERIFICATION', 'LOCKED'];

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  master_or_specialist: { x: 8, y: 210 },
  postgraduate_or_attachment: { x: 24, y: 210 },
  candidate_degree: { x: 40, y: 210 },
  doctor_degree: { x: 59, y: 105 },
  docent_title: { x: 59, y: 305 },
  professor_title: { x: 82, y: 210 },
  ras_professor: { x: 55, y: 455 },
  ras_corresponding_member: { x: 73, y: 455 },
  ras_academician: { x: 91, y: 455 }
};

const NODE_ICONS: Record<string, LucideIcon> = {
  master_or_specialist: GraduationCap,
  postgraduate_or_attachment: BookOpenCheck,
  candidate_degree: BadgeCheck,
  doctor_degree: ScrollText,
  docent_title: UsersRound,
  professor_title: Trophy,
  ras_professor: Award,
  ras_corresponding_member: Landmark,
  ras_academician: Crown
};

export function CareerRoadmap({ careerMap, members = [] }: { careerMap: CareerMapMember[]; members?: PublicMember[] }) {
  const [memberSlug, setMemberSlug] = useState(careerMap[0]?.memberSlug ?? '');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const selected = useMemo(() => {
    return careerMap.find((item) => item.memberSlug === memberSlug) ?? careerMap[0];
  }, [careerMap, memberSlug]);

  const selectedMember = useMemo(() => members.find((member) => member.slug === selected?.memberSlug), [members, selected?.memberSlug]);

  const graph = useMemo(() => {
    const ordered = [...(selected?.milestones ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return buildCareerGraph(ordered);
  }, [selected]);

  const graphNodes = graph.graphNodes as Array<CareerGraphNode & Milestone>;
  const activeNode = useMemo(() => {
    return graphNodes.find((node) => node.key === activeKey) ?? findFocusGraphNode(graphNodes);
  }, [activeKey, graphNodes]);

  if (!careerMap.length || !selected) {
    return <div className="empty-state">Карьерная карта ещё не сгенерирована. Запустите `pnpm harvest:all:local`.</div>;
  }

  const coreNodes = graphNodes.filter((node) => node.graph_track !== 'academy');
  const completed = coreNodes.filter((node) => node.status === 'COMPLETED').length;
  const progress = Math.round((completed / Math.max(1, coreNodes.length)) * 100);

  return (
    <div className="career-console">
      <div className="career-toolbar">
        <div className="career-member-select">
          <span>Участник</span>
          <label>
            <MemberAvatar member={selectedMember} name={selected.memberName} size={44} />
            <select value={selected.memberSlug} onChange={(event) => { setMemberSlug(event.target.value); setActiveKey(null); }}>
              {careerMap.map((member) => <option key={member.memberSlug} value={member.memberSlug}>{member.memberName}</option>)}
            </select>
          </label>
        </div>
        <div className="career-summary">
          <div><span>Текущий этап</span><strong>{selected.currentStatus}</strong></div>
          <div><span>Прогресс</span><strong>{progress}%</strong></div>
          <div><span>Крупных этапов</span><strong>{completed} / {coreNodes.length}</strong></div>
          <div><span>Следующий шаг</span><strong>{selected.nextStep}</strong></div>
        </div>
      </div>

      <div className="career-legend" aria-label="Легенда статусов">
        {STATUS_ORDER.map((status) => <span key={status} data-status={status.toLowerCase()}>{STATUS_META[status].label}</span>)}
      </div>

      <div className="career-flow-layout">
        <CareerFlowGraph nodes={graphNodes} activeKey={activeNode?.key} onSelect={setActiveKey} />
        <CareerDetail node={activeNode} selected={selected} member={selectedMember} fallbackProgress={progress} />
      </div>
    </div>
  );
}

function CareerFlowGraph({ nodes, activeKey, onSelect }: { nodes: Array<CareerGraphNode & Milestone>; activeKey?: string; onSelect: (key: string) => void }) {
  const visibleNodes = nodes.filter((node) => NODE_POSITIONS[node.key]);
  const academyNodes = visibleNodes.filter((node) => node.graph_track === 'academy');

  return (
    <section className="career-flow-shell" aria-label="Граф карьерной траектории">
      <div className="career-flow-scroll">
        <div className="career-flow-canvas">
          <svg className="career-flow-lines" viewBox="0 0 100 580" preserveAspectRatio="none" aria-hidden>
            <defs>
              <marker id="career-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" />
              </marker>
              <marker id="career-arrow-muted" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" />
              </marker>
            </defs>
            <path className="flow-line" d="M12.7 210 H19.3" markerEnd="url(#career-arrow)" />
            <path className="flow-line" d="M28.7 210 H35.3" markerEnd="url(#career-arrow)" />
            <path className="flow-line" d="M44.2 194 C50 170 49 128 55.4 116" markerEnd="url(#career-arrow)" />
            <path className="flow-line" d="M44.2 226 C50 250 49 282 55.4 294" markerEnd="url(#career-arrow)" />
            <path className="flow-line" d="M63.2 121 C70 126 72 188 77.7 202" markerEnd="url(#career-arrow)" />
            <path className="flow-line" d="M63.2 289 C70 284 72 222 77.7 218" markerEnd="url(#career-arrow)" />
            {academyNodes.length ? (
              <>
                <path className="flow-line academy" d="M58.6 141 C58 235 52 340 54.5 419" markerEnd="url(#career-arrow-muted)" />
                <path className="flow-line academy" d="M59.7 455 H68.3" markerEnd="url(#career-arrow-muted)" />
                <path className="flow-line academy" d="M77.7 455 H86.3" markerEnd="url(#career-arrow-muted)" />
              </>
            ) : null}
          </svg>

          <div className="career-branch-caption doctor">Степень доктора наук</div>
          <div className="career-branch-caption docent">Учёное звание доцента</div>
          {academyNodes.length ? <div className="career-branch-caption academy">Контур РАН</div> : null}

          {visibleNodes.map((node) => (
            <CareerGraphButton key={node.key} node={node} activeKey={activeKey} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CareerGraphButton({ node, activeKey, onSelect }: { node: CareerGraphNode & Milestone; activeKey?: string; onSelect: (key: string) => void }) {
  const position = NODE_POSITIONS[node.key];
  const status = STATUS_META[node.status] ?? STATUS_META.LOCKED;
  const Icon = NODE_ICONS[node.key] ?? BadgeCheck;
  return (
    <button
      className="career-graph-node"
      data-status={node.status.toLowerCase()}
      data-track={node.graph_track}
      type="button"
      aria-pressed={activeKey === node.key}
      style={{ left: `${position.x}%`, top: `${position.y}px` }}
      onClick={() => onSelect(node.key)}
    >
      <span className="career-node-orb">
        <Icon className="career-node-icon" aria-hidden strokeWidth={2.2} />
      </span>
      <strong>{node.graph_label}</strong>
      <small>{status.short}</small>
    </button>
  );
}

function CareerDetail({
  node,
  selected,
  member,
  fallbackProgress
}: {
  node: (CareerGraphNode & Milestone) | undefined;
  selected: CareerMapMember;
  member?: PublicMember;
  fallbackProgress: number;
}) {
  if (!node) return null;
  const status = STATUS_META[node.status] ?? STATUS_META.LOCKED;
  const group = node.groupedMilestones.length ? node.groupedMilestones : [node];
  const progressItems = group.flatMap((milestone) => milestone.progressItems ?? []);
  const legalBasis = unique(group.flatMap((milestone) => milestone.legal_basis ?? []));
  const evidence = unique(group.flatMap((milestone) => milestone.evidence_required ?? []));
  const nextActions = unique(group.flatMap((milestone) => milestone.nextActions ?? []));
  const groupProgress = summarizeGroupProgress(group, fallbackProgress);

  return (
    <aside className="career-detail-panel" aria-label="Условия выбранного этапа">
      <div className="career-detail-member">
        <MemberAvatar member={member} name={selected.memberName} size={56} />
        <div>
          <span>Профиль участника</span>
          <strong>{selected.memberName}</strong>
          <small>{selected.institute}</small>
        </div>
      </div>

      <div className="career-detail-stage">
        <span className="detail-stage">Выбранный этап</span>
        <h2>{node.graph_label}</h2>
        <p>{node.description ?? node.label}</p>
        <strong className="status-pill" data-status={node.status.toLowerCase()}>{status.label}</strong>
      </div>

      <div className="career-progress-card">
        <span>Выполнение условий</span>
        <div className="progress-line"><span style={{ width: `${groupProgress.percent}%` }} /></div>
        <small>{groupProgress.label}</small>
      </div>

      <div className="career-detail-block">
        <h3>Условия получения</h3>
        <ul className="career-requirement-list">
          {group.map((milestone) => (
            <li key={milestone.key} data-status={milestone.status.toLowerCase()}>
              <div>
                <strong>{milestone.label}</strong>
                {milestone.description ? <p>{milestone.description}</p> : null}
              </div>
              <span>{STATUS_META[milestone.status]?.short ?? milestone.status}</span>
            </li>
          ))}
        </ul>
      </div>

      {progressItems.length ? (
        <div className="career-detail-block">
          <h3>Измеримые критерии</h3>
          <ul className="career-metric-list clean">
            {progressItems.slice(0, 8).map((item) => (
              <li key={item.key} data-status={item.status}>
                <span>{item.label}</span>
                <strong>{item.current == null ? 'ручная проверка' : `${formatNumber(item.current)} / ${formatNumber(item.target)}`}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="career-detail-block">
        <h3>Нормативная база</h3>
        <p>{legalBasis.length ? legalBasis.map((key) => LEGAL_LABELS[key] ?? key).join(', ') : 'Нормативное основание требует ручной проверки.'}</p>
      </div>

      {evidence.length ? (
        <div className="career-detail-block">
          <h3>Документы и подтверждения</h3>
          <ul className="evidence-list clean">
            {evidence.slice(0, 6).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="career-detail-block">
        <h3>Следующие действия</h3>
        <ul className="next-actions clean">
          {(nextActions.length ? nextActions : selected.missing).slice(0, 5).map((action) => <li key={action}>{action}</li>)}
          {!nextActions.length && !selected.missing.length ? <li>Подтверждающие действия не требуются.</li> : null}
        </ul>
      </div>
    </aside>
  );
}

function MemberAvatar({ member, name, size }: { member?: PublicMember; name: string; size: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  if (member?.photo_url) {
    return (
      <Image
        className="career-member-photo"
        src={publicAssetPath(member.photo_url)}
        alt={member.photo_status === 'downloaded' ? `Фото: ${name}` : `Аватар: ${name}`}
        width={size}
        height={size}
        unoptimized
      />
    );
  }
  return <span className="career-member-initials" style={{ width: size, height: size }} aria-hidden>{initials}</span>;
}

function findFocusGraphNode(nodes: Array<CareerGraphNode & Milestone>) {
  return nodes.find((node) => node.status === 'READY' || node.status === 'IN_PROGRESS' || node.status === 'NEEDS_VERIFICATION')
    ?? nodes.find((node) => node.status === 'LOCKED')
    ?? nodes[0];
}

function summarizeGroupProgress(group: Array<Pick<Milestone, 'status' | 'progressItems'>>, fallbackPercent: number) {
  const knownItems = group.flatMap((milestone) => milestone.progressItems ?? []).filter((item) => item.current != null);
  if (knownItems.length) {
    const met = knownItems.filter((item) => item.status === 'met').length;
    return {
      percent: Math.round((met / knownItems.length) * 100),
      label: `${met} / ${knownItems.length}: автоматически проверяемых критериев закрыто`
    };
  }
  const completed = group.filter((milestone) => milestone.status === 'COMPLETED').length;
  return {
    percent: Math.round((completed / Math.max(1, group.length)) * 100) || fallbackPercent,
    label: `${completed} / ${group.length}: условий этапа закрыто или подтверждено`
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
