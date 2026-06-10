import Image from 'next/image';
import Link from 'next/link';
import { BRAND, NAVIGATION } from '@/lib/brand';
import { publicAssetPath } from '@/lib/deploy';

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand-mark" aria-label="На главную">
          <Image className="brand-logo" src={publicAssetPath(BRAND.logo)} alt="Логотип ФНИСЦ РАН" width={96} height={72} priority />
          <strong>{BRAND.name}</strong>
        </Link>
        <nav className="main-nav" aria-label="Основная навигация">
          {NAVIGATION.map((item) => (
            item.disabled ? (
              <span key={item.href} className="main-nav-item-disabled" aria-disabled="true">
                {item.label}
              </span>
            ) : (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            )
          ))}
        </nav>
      </div>
    </header>
  );
}
