import { MemberDirectory } from '@/components/MemberDirectory';
import { getPublicMembers } from '@/lib/data/publicMembers';

export default async function MembersPage() {
  const members = await getPublicMembers();
  return (
    <section className="page">
      <div className="page-title">
        <h1>Состав СМУ</h1>
        <p>Публичный реестр сформирован из академических полей: ФИО, институт, подразделение, должность, степень/статус, научные интересы, e-mail, фотографии профилей и наукометрические идентификаторы. Телефоны хранятся только в закрытом локальном реестре.</p>
      </div>
      <MemberDirectory members={members} />
    </section>
  );
}
