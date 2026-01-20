/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'ibe.jinfotours.ro',
      pathname: '/resources/**',
    },
    {
      protocol: 'http',
      hostname: 'ibe.jinfotours.ro',
      pathname: '/resources/**',
    }
  ],
  minimumCacheTTL: 60,
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  // ⬇️ ADAUGĂ ASTA:
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false, // păstrăm optimizarea
  domains: ['ibe.jinfotours.ro'], // deprecated dar mai funcționează
},
}

module.exports = nextConfig