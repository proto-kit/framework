"use client";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ExternalLink, Moon, Search } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import config from "@/config";

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
        className={cn(
          "min-h-screen h-full font-sans flex flex-col antialiased justify-between",
          [GeistSans.variable, GeistMono.variable]
        )}
      >
        <div className="min-w-screen  h-full w-full flex flex-col flex-grow">
          <Header />
          <div className="flex flex-grow flex-col h-full w-full min-h-full max-w-screen-lg mx-auto">
            {children}
          </div>
        </div>
        <div className="items-start justify-center  mt-6 mb-6">
          <div className="flex flex-row h-full justify-center max-w-screen-lg mx-auto items-start gap-3">
            <Button
              variant={"link"}
              className="text-muted-foreground pl-0 flex flex-row justify-center items-center gap-1 font-light"
              onClick={() =>
                window.open("https://discord.gg/AMGnGAxsKp", "_blank")
              }
            >
              Discord
            </Button>
            <Button
              variant={"link"}
              className="text-muted-foreground pl-0 flex flex-row justify-center items-center gap-1 font-light"
              onClick={() =>
                window.open("https://github.com/proto-kit/framework", "_blank")
              }
            >
              Github
            </Button>
            <Button
              variant={"link"}
              className="text-muted-foreground pl-0 flex flex-row justify-center items-center gap-1 font-light"
              onClick={() => window.open(config.INDEXER_URL, "_blank")}
            >
              GQL Queries
            </Button>
            <Button
              variant={"link"}
              className="text-muted-foreground pl-0 font-light"
              onClick={() => window.open("https://protokit.dev/", "_blank")}
            >
              Documentation
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
