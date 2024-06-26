import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Search } from "lucide-react";
import { Input } from "./ui/input";

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
        <div className="flex flex-row items-center gap-4 relative">
          {/* commented out card has hover styles, enable it when search is ready */}
          {/* <Card className="transition-all ease-in-out flex items-center shadow-none min-w-[220px] hover:min-w-[280px] min-h-[40px]"> */}
          {/* <Card className="transition-all ease-in-out flex items-center shadow-none min-w-[220px]  min-h-[40px]">
            <Search className="w-4 h-4 absolute right-3" />
            <Input
              disabled
              className=" h-full mr-5 border-none focus-visible:ring-offset-0 focus-visible:ring-0 focus-visible:shadow-none"
              // placeholder="Search by hash"
              placeholder="Coming soon..."
            />
          </Card> */}
        </div>
      </div>
    </div>
  );
}
