import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "运动损伤资料管理与指标分析平台",
  description: "运动医学从业者局域网内共享损伤资料与指标数据",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <NextTopLoader color="#06B6D4" height={3} showSpinner={false} />
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

