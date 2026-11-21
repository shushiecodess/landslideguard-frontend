const endpoint = process.env.API_BACKEND_URL?.trim()
const onRender = process.env.RENDER === 'true'
if (onRender && !endpoint) {
  throw new Error('Set API_BACKEND_URL to the public HTTPS origin of the VPS API.')
}

const backend = new URL(endpoint || 'http://127.0.0.1:8000')
if (!['http:', 'https:'].includes(backend.protocol) ||
    backend.username || backend.password || backend.pathname !== '/' ||
    backend.search || backend.hash || (onRender && backend.protocol !== 'https:')) {
  throw new Error('API_BACKEND_URL must be an HTTP(S) origin without a path. Render requires HTTPS.')
}

export default {
  poweredByHeader: false,
  turbopack: { root: import.meta.dirname },
  experimental: {
    // Preserve the API's 50 MB CSV upload and long-running retraining support.
    proxyClientMaxBodySize: '51mb',
    proxyTimeout: 900_000,
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${backend.origin}/api/:path*` }],
    }
  },
}
