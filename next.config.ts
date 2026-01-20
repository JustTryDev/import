import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 📌 외부 이미지 도메인 허용 설정
  // Next.js의 <Image> 컴포넌트는 보안상 외부 이미지 도메인을 명시적으로 허용해야 함
  // 필요한 도메인을 여기에 추가하세요
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",  // Unsplash 샘플 이미지
      },
      // 📌 추가 예시:
      // {
      //   protocol: "https",
      //   hostname: "*.supabase.co",  // Supabase Storage
      // },
      // {
      //   protocol: "https",
      //   hostname: "*.r2.dev",  // Cloudflare R2
      // },
    ],
  },
};

export default nextConfig;
