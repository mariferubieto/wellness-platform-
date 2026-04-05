// frontend/next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
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
