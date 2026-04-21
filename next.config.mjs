/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.10.205.42', 'localhost'],
  serverExternalPackages: ['pdf-parse']
};

export default nextConfig;
