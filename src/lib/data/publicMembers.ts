import { getPublicMembersData } from './publicData';

export type PublicMember = {
  slug: string;
  full_name: string;
  email?: string;
  public_emails?: string[];
  institute?: string;
  unit?: string;
  position?: string;
  degree_status?: string;
  education_public_note?: string;
  interests?: string;
  roles_and_achievements?: string;
  public_comment?: string;
  identifiers?: Record<string, string>;
  fnisc_profile_url?: string;
  fnisc_profile_id?: string;
  photo_url?: string;
  photo_status?: 'downloaded' | 'placeholder' | 'not_found' | 'error' | string;
  photo_source_profile_url?: string;
  photo_source_url?: string;
  photo_downloaded_at?: string;
  sources_note?: string;
};

export async function getPublicMembers(): Promise<PublicMember[]> {
  return getPublicMembersData();
}

export async function getCouncilKpis() {
  const members = await getPublicMembers();
  const withRinc = members.filter((m) => m.identifiers?.elibrary_author_id).length;
  const withScopus = members.filter((m) => m.identifiers?.scopus_author_id).length;
  const withWos = members.filter((m) => m.identifiers?.wos_researcher_id).length;
  const withEmail = members.filter((m) => m.email || (m.public_emails?.length ?? 0) > 0).length;
  const withDownloadedPhoto = members.filter((m) => m.photo_status === 'downloaded').length;
  const candidates = members.filter((m) => /к\./i.test(m.degree_status || '')).length;
  return { members: members.length, withRinc, withScopus, withWos, withEmail, withDownloadedPhoto, candidates };
}
