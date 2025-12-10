/** @type {import('next').NextConfig} */
const nextConfig = {
  // CSS HMR 문제 해결을 위한 webpack 설정
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  images: {
    remotePatterns: [
      // YouTube thumbnails
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
      },
      // Coupang images
      {
        protocol: "https",
        hostname: "**.coupangcdn.com",
      },
      {
        protocol: "https",
        hostname: "image*.coupangcdn.com",
      },
      {
        protocol: "https",
        hostname: "thumbnail*.coupangcdn.com",
      },
      {
        protocol: "https",
        hostname: "static.coupangcdn.com",
      },
      // Other e-commerce platforms
      {
        protocol: "https",
        hostname: "**.11st.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.gmarket.co.kr",
      },
      {
        protocol: "https",
        hostname: "**.auction.co.kr",
      },
    ],
  },
};

module.exports = nextConfig;
