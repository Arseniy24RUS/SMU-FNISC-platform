import Image from 'next/image';
import { BRAND } from '@/lib/brand';
import { publicAssetPath } from '@/lib/deploy';

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <div className="footer-brand">
          <Image src={publicAssetPath(BRAND.logoMark)} alt="Логотип ФНИСЦ РАН" width={42} height={42} />
          <strong>Платформа молодых исследователей</strong>
        </div>
        <p>Платформа для молодых исследователей: публикации, события, СМИ и карьерная навигация.</p>
      </div>
      <div className="footer-note">
        <p>Все автоматические выводы требуют модерации. Карьерные критерии хранятся в конфиге и сверяются с актуальными нормативными документами.</p>
      </div>
    </footer>
  );
}
