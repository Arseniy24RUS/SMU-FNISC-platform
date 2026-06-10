import { evaluateCareer } from '../src/lib/career/evaluate';
import { loadCareerRules } from '../src/lib/career/rules';
import { demoPublications } from '../src/lib/demo/publications';

async function main() {
  const rules = await loadCareerRules();
  const evaluation = evaluateCareer({ publications: demoPublications, teachingPeriods: [{ startsAt: '2024-09-01' }], overrides: [{ milestoneKey: 'master_or_specialist', status: 'COMPLETED' }] }, rules);
  console.log(JSON.stringify(evaluation, null, 2));
}

main();
