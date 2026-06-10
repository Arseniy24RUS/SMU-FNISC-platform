export const BRAND = {
  name: 'СМУ ФНИСЦ РАН',
  longName: 'Совет молодых учёных Федерального научно-исследовательского социологического центра РАН',
  tagline: 'Карьерная навигация, наукометрия и публичная коммуникация молодых исследователей.',
  logo: '/brand/fnisc-logo.png',
  logoMark: '/brand/fnisc-logo-mark.png',
  colors: {
    navy: '#182B62',
    blue: '#296DC1',
    red: '#9E1F2F',
    gold: '#B8943D',
    pale: '#F4F7FB',
    ink: '#111827'
  }
} as const;

type NavItem = {
  href: string;
  label: string;
  disabled?: boolean;
};

export const NAVIGATION: NavItem[] = [
  { href: '/', label: 'Главная' },
  { href: '/media', label: 'Новости' },
  { href: '/events', label: 'Мероприятия' },
  { href: '/members', label: 'Участники' },
  { href: '/publications', label: 'Публикации' },
  { href: '/career', label: 'Карьера' },
  { href: '/support', label: 'Меры поддержки' }
];
