import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Kita hapus bagian experimental turbopack karena menyebabkan error invalid
}

export default withPWA(nextConfig)
