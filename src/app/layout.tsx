import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import MuiProvider from "@/app/context/theme-provider";
import AuthGuard from "@/components/auth/auth-guard";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "AI Metrics Dashboard - LibreChat Analytics",
	description:
		"Dashboard for monitoring and analyzing LibreChat AI usage metrics, token consumption, and agent statistics.",
	icons: {
		icon: [
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
		],
		apple: [
			{ url: "/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
		],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				<InitColorSchemeScript defaultMode="system" attribute="data" />
				<MuiProvider>
					<AuthGuard>{children}</AuthGuard>
				</MuiProvider>
			</body>
		</html>
	);
}
