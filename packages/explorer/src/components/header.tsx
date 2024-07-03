import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";
import config from "@/config";

export default function Header() {
  const router = useRouter();

  return (
    <div className="items-center justify-between pt-4 pb-4 mb-4 flex w-full ">
      <div className="max-w-screen-lg mx-auto w-full flex">
        <div className="flex gap-0 text-sm font-normal">
          <Button
            className="pl-0"
            variant={"link"}
            onClick={() => router.push("/")}
          >
            Home
          </Button>
          <Button variant={"link"} onClick={() => router.push("/blocks")}>
            Blocks
          </Button>
          <Button variant={"link"} onClick={() => router.push("/transactions")}>
            Transactions
          </Button>
          <Button
            variant={"link"}
            onClick={() => window.open(config.INDEXER_URL, "_blank")}
            className="flex items-center gap-1 justify-between -ml-1"
          >
            <ExternalLink className="w-4 h-4 text-foreground" />
            GQL queries
          </Button>
        </div>
        <div className="flex flex-grow gap-3 justify-end">
          {/* <Search /> */}
        </div>
      </div>
    </div>
  );
}
