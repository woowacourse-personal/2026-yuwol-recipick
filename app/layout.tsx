import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "레시픽",
  description: "유튜브 레시피를 요리용 카드로 아카이빙하는 서비스",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "레시픽",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-neutral-50 text-neutral-900 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
