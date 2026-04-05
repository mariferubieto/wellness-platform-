// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Para imágenes de Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
