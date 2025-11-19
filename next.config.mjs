/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export', // ✅ ensures static build for Capacitor
  images: {
    unoptimized: true,
  },
}

export default nextConfig
