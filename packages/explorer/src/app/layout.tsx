"use client";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { cn } from "@/lib/utils";
import Header from "@/components/header";

// export const metadata: Metadata = {
//   title: "Explorer",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn("min-h-screen  font-sans flex flex-col antialiased", [
          GeistSans.variable,
          GeistMono.variable,
        ])}
      >
        <div className="flex flex-col h-full w-full max-w-screen-lg mx-auto">
          <div className="min-w-full">
            <Header />

            <div className="min-w-full">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
