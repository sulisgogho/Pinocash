import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Memastikan Webpack diterima tanpa error Turbopack
  webpack: (config) => {
    return config
  },
}

export default withPWA(nextConfig)
