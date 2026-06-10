import { CareerRoadmap } from '@/components/CareerRoadmap';
import { getCareerMapData } from '@/lib/data/publicData';
import { getPublicMembers } from '@/lib/data/publicMembers';

export default async function CareerPage() {
  const [careerMap, members] = await Promise.all([getCareerMapData(), getPublicMembers()]);
  return (
    <section className="page">
      <div className="page-title">
        <h1>Карьерная траектория</h1>
        <p>Карта показывает актуальную навигацию по российской научной карьере: после кандидатской степени докторская диссертация и учёное звание доцента идут параллельно, а профессорский трек открывается только при сочетании «доктор наук + доцент + срок после доцента». Это продуктовая подсказка по НПА и данным профиля, а не юридическое заключение.</p>
      </div>
      <CareerRoadmap careerMap={careerMap} members={members} />
    </section>
  );
}
