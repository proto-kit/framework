"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Blocks", href: "/blocks" },
  { label: "Transactions", href: "/transactions" },
  { label: "Batches", href: "/batches" },
  { label: "Settlements", href: "/settlements" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="flex items-center justify-between w-full pt-4 mb-9">
      <nav className="flex gap-4 text-sm font-normal">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Button
              key={href}
              variant="link"
              onClick={() => {
                if (pathname !== href) {
                  router.push(href);
                }
              }}
              className={cn(
                "px-0 text-muted-foreground hover:text-foreground",
                isActive &&
                  "text-foreground font-medium underline underline-offset-4"
              )}
            >
              {label}
            </Button>
          );
        })}
      </nav>
    </header>
  );
}
