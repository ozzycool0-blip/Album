/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/stickers/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ixjgeffkmxikmqhflguw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/album-uploads/**',
      },
    ],
  },
}

module.exports = nextConfig