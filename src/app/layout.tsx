import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";


export const metadata: Metadata = {
  title: "새로핌ON | SeraphimON",
  description: "새문안교회 새로핌찬양대를 위한 종합 플랫폼",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    shortcut: "/icon-192x192.png",
    apple: "/icon-512x512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body
        className="antialiased bg-[var(--color-background-primary)] text-[var(--color-text-primary)]"
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
