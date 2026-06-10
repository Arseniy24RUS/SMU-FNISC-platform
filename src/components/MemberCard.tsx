import Link from 'next/link';
import Image from 'next/image';
import type { PublicMember } from '@/lib/data/publicMembers';
import { publicAssetPath } from '@/lib/deploy';

function memberInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

export function MemberCard({ member }: { member: PublicMember }) {
  const ids = member.identifiers || {};
  const emails = member.public_emails?.length ? member.public_emails : member.email ? [member.email] : [];
  const imageAlt = member.photo_status === 'downloaded' ? `Фото: ${member.full_name}` : `Аватар: ${member.full_name}`;
  return (
    <article className="member-card">
      {member.photo_url ? (
        <Image className="member-photo" src={publicAssetPath(member.photo_url)} alt={imageAlt} width={88} height={88} loading="lazy" unoptimized />
      ) : (
        <div className="avatar-placeholder" aria-hidden>{memberInitials(member.full_name)}</div>
      )}
      <div>
        <h3>{member.full_name}</h3>
        <p className="muted">{member.position || '—'} · {member.degree_status || 'без указания степени'}</p>
        <p>{member.institute}</p>
        {member.interests ? <p className="member-interests">{member.interests}</p> : null}
        <div className="tag-row">
          {ids.elibrary_author_id ? <span>РИНЦ {ids.elibrary_author_id}</span> : null}
          {ids.scopus_author_id ? <span>Scopus {ids.scopus_author_id}</span> : null}
          {ids.wos_researcher_id ? <span>WoS {ids.wos_researcher_id}</span> : null}
          {ids.orcid ? <span>ORCID</span> : null}
        </div>
        <div className="member-links">
          {emails[0] ? <a className="text-link" href={`mailto:${emails[0]}`}>{emails[0]}</a> : null}
          {member.fnisc_profile_url ? <Link className="text-link" href={member.fnisc_profile_url}>Профиль ФНИСЦ / ИС РАН</Link> : null}
        </div>
      </div>
    </article>
  );
}
