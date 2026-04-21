/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.10.205.42', 'localhost'],
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist']
};

export default nextConfig;
