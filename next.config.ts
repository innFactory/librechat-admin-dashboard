import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
	output: "standalone",
	basePath: basePath.length > 0 ? basePath : undefined,
	assetPrefix: basePath.length > 0 ? basePath : undefined,
	poweredByHeader: false,
	reactStrictMode: true,
	images: {
		unoptimized: true,
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-DNS-Prefetch-Control", value: "on" },
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains; preload",
					},
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
	async redirects() {
		return [
			{
				source: "/",
				destination: "/dashboard",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
