/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages';

const nextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export',
        basePath: '/SMU-FNISC-platform',
        trailingSlash: true,
        images: { unoptimized: true }
      }
    : {
        experimental: {
          serverActions: { bodySizeLimit: '20mb' }
        },
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
              ]
            }
          ];
        }
      })
};
export default nextConfig;
