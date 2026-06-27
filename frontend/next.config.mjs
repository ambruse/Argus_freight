/** @type {import('next').NextConfig} */
const nextConfig = {
  // Isolate development cache to prevent HMR asset 404 conflicts
  distDir: process.env.NODE_ENV === "development" ? ".next/dev" : ".next",
  // Allow proxying API requests to backend in development
  async rewrites() {
    const backendPort = process.env.NODE_ENV === "production" ? "3009" : "3001";
    return [
      {
        source: "/socket.io/:path*",
        destination: `http://127.0.0.1:${backendPort}/socket.io/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `http://127.0.0.1:${backendPort}/api/:path*`,
      },
      {
        source: "/",
        destination: "/landing/index.html",
      },
      {
        source: "/about",
        destination: "/landing/index.html",
      },
      {
        source: "/services",
        destination: "/landing/index.html",
      },
      {
        source: "/why-us",
        destination: "/landing/index.html",
      },
      {
        source: "/team",
        destination: "/landing/index.html",
      },
      {
        source: "/contact",
        destination: "/landing/index.html",
      },
      {
        source: "/chairman-message",
        destination: "/landing/index.html",
      },
    ];
  },
  // Apply standard browser security headers to all routes
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src *;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;