import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";


export const metadata: Metadata = {
  title: "찬양대 자리배치 시스템",
  description: "AI 기반 찬양대 자리배치 자동화 솔루션",
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
