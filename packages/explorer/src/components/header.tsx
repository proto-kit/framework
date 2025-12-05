import { useRouter } from "next/navigation";

import { Button } from "./ui/button";

export default function Header() {
  const router = useRouter();

  return (
    <div className="items-center justify-between pt-4 mb-9 flex w-full">
      <div className="flex gap-0 text-sm font-normal">
        <Button
          className="pl-0"
          variant={"link"}
          onClick={() => router.push("/blocks")}
        >
          Blocks
        </Button>
        <Button variant={"link"} onClick={() => router.push("/transactions")}>
          Transactions
        </Button>
      </div>
      <div className="flex flex-grow gap-3 justify-end">
        <div className="flex flex-row items-center gap-4 relative"></div>
      </div>
    </div>
  );
}
