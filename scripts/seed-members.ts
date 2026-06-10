import { loadLocalEnv } from '../src/lib/loadEnv';

loadLocalEnv();

const { readFile } = await import('node:fs/promises');
const { join } = await import('node:path');
const { db } = await import('../src/lib/db');

type SeedMember = {
  slug: string;
  full_name: string;
  email?: string;
  public_emails?: string[];
  institute?: string;
  unit?: string;
  position?: string;
  degree_status?: string;
  interests?: string;
  roles_and_achievements?: string;
  public_comment?: string;
  fnisc_profile_url?: string;
  fnisc_profile_id?: string;
  photo_url?: string;
  identifiers?: Record<string, string>;
};

async function main() {
  const raw = await readFile(join(process.cwd(), 'data/seeds/members.public.json'), 'utf-8');
  const members = JSON.parse(raw) as SeedMember[];
  for (const m of members) {
    const publicEmails = m.public_emails?.length ? m.public_emails : m.email ? [m.email] : [];
    const member = await db.member.upsert({
      where: { slug: m.slug },
      create: {
        slug: m.slug,
        fullName: m.full_name,
        email: m.email || publicEmails[0],
        publicEmailsJson: JSON.stringify(publicEmails),
        institute: m.institute,
        unit: m.unit,
        position: m.position,
        degreeStatus: m.degree_status,
        interests: m.interests,
        rolesAndAchievements: m.roles_and_achievements,
        publicComment: m.public_comment,
        fniscProfileUrl: m.fnisc_profile_url,
        fniscProfileId: m.fnisc_profile_id,
        photoUrl: m.photo_url
      },
      update: {
        email: m.email || publicEmails[0],
        publicEmailsJson: JSON.stringify(publicEmails),
        institute: m.institute,
        unit: m.unit,
        position: m.position,
        degreeStatus: m.degree_status,
        interests: m.interests,
        rolesAndAchievements: m.roles_and_achievements,
        publicComment: m.public_comment,
        fniscProfileUrl: m.fnisc_profile_url,
        fniscProfileId: m.fnisc_profile_id,
        photoUrl: m.photo_url
      }
    });
    for (const [system, value] of Object.entries(m.identifiers ?? {})) {
      if (!value) continue;
      await db.identifier.upsert({
        where: { memberId_system: { memberId: member.id, system } },
        create: { memberId: member.id, system, value, verified: false },
        update: { value }
      });
    }
  }
  console.log(`Seeded ${members.length} members`);
}

main().finally(() => db.$disconnect());
