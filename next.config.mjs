/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Relax COOP/COEP to allow browser wallet extensions to inject providers
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          // COEP disabled globally to avoid breaking wallet injection; if Relayer needs it, scope headers to specific routes only
          // Relax resource policy to allow loading WASM/Worker from CDN
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;


