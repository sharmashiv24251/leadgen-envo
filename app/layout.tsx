import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ContextMenuProvider from "@/components/ContextMenu";
import QueryProvider from "@/components/QueryProvider";
import TopBar from "@/components/TopBar";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "thehrcompany — Command Center",
  description: "Cold-outreach automation command center.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex h-full flex-col overflow-hidden bg-bg font-sans text-ink antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <QueryProvider>
          <ContextMenuProvider>
            <TopBar />
            <AppShell>{children}</AppShell>
          </ContextMenuProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
