import Link from 'next/link';

type Props = {
  title: string;
  href?: string;
  children: React.ReactNode;
  eyebrow?: string;
};

export function SectionCard({ title, href, children, eyebrow }: Props) {
  return (
    <section className="section-card">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{href ? <Link href={href}>{title}</Link> : title}</h2>
      <div>{children}</div>
    </section>
  );
}
