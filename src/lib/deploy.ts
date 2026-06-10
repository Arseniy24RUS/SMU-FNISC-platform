export const DEPLOY_TARGET = process.env.NEXT_PUBLIC_DEPLOY_TARGET ?? 'node';
export const IS_GITHUB_PAGES = DEPLOY_TARGET === 'github-pages';
export const PUBLIC_BASE_PATH = IS_GITHUB_PAGES ? '/SMU-FNISC-platform' : '';

export function publicAssetPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith(PUBLIC_BASE_PATH)) return path;
  return `${PUBLIC_BASE_PATH}${path}`;
}
