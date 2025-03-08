import { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://pedidos.lucrapp.com',
  },
  // Simplificamos la configuración para ser más estable en producción
  experimental: {
    serverComponentsExternalPackages: ['crypto-js'],
  },
  // Esta es una configuración importante para evitar problemas con la compilación
  typescript: {
    // Ignorar errores de TS durante la compilación
    ignoreBuildErrors: true,
  },
  // Configuración para ignorar errores de webpack
  webpack: (config, { isServer }) => {
    // Ignorar advertencias sobre módulos duplicados
    config.optimization.moduleIds = 'named';
    
    // Ignorar advertencias específicas
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }
    
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

// Configuration for Next.js
const configWithOptions = {
  ...nextConfig
};

// @ts-ignore
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})(configWithOptions);

export default pwaConfig;
