"use client";

import { useRouter, usePathname } from "next/navigation";

import { Button } from "./ui/button";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="items-center justify-between pt-4 mb-9 flex w-full">
      <div className="flex gap-0 text-sm font-normal">
        <Button
          className="pl-0"
          variant={"link"}
          onClick={() => {
            if (!pathname?.startsWith("/blocks")) {
              router.push("/blocks");
            }
          }}
        >
          Blocks
        </Button>
        <Button
          variant={"link"}
          onClick={() => {
            if (!pathname?.startsWith("/transactions")) {
              router.push("/transactions");
            }
          }}
        >
          Transactions
        </Button>
      </div>
      <div className="flex flex-grow gap-3 justify-end">
        <div className="flex flex-row items-center gap-4 relative"></div>
      </div>
    </div>
  );
}
