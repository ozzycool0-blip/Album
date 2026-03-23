import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
        pathname: '/storage/v1/object/public/album-uploads/**',
      },
    ],
  },
}

export default nextConfig