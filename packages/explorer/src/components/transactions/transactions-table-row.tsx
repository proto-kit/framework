import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import Truncate from "react-truncate-inside";
import { ChevronRight, CircleCheck, CircleX, Clipboard } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TableItemTitle } from "../list";

export interface TableItem {
  hash: string;
  methodId: string;
  sender: string;
  status: string;
  nonce: string;
  statusMessage: string;
}

export interface TableRowProps {
  key: number;
  columns: Record<string, TableItemTitle>;
  view: string[];
  loading: boolean;
  item: TableItem;
}
export default function TransactionsTableRow({
  key,
  columns,
  view,
  loading,
  item,
}: TableRowProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<Record<any, any>>({});

  return (
    <TableRow
      key={key}
      onClick={() => router.push(`/transactions/${item.hash}`)}
    >
      {Object.keys(columns).map(
        (key) =>
          view.includes(key) && (
            <TableCell className={""}>
              {!loading ? (
                key === "hash" || key === "methodId" || key == "sender" ? (
                  <div
                    className="flex gap-1.5 items-center group relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigator.clipboard.writeText(
                        item[key as keyof TableItem]
                      );
                      setCopied({
                        [key]: true,
                      });
                      setTimeout(
                        () =>
                          setCopied({
                            [key]: false,
                          }),
                        2000
                      );
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute w-full rounded-md flex items-center justify-start bg-gray-50">
                      <div className="flex items-center justify-center gap-1.5">
                        <Clipboard className="w-4 h-4  text-muted-foreground" />
                        <span className="text-md">
                          {!copied[key]
                            ? "Click to copy"
                            : "Copied successfully!"}
                        </span>
                      </div>
                    </div>
                    <div className="group-hover:opacity-0">
                      <Truncate
                        text={item[key as keyof TableItem]}
                        width={150}
                        // offset={item[key as keyof TableItem].length / 2 - 3}
                      />
                    </div>
                  </div>
                ) : key === "status" ? (
                  <div className="flex w-full items-center justify-center">
                    {item[key as keyof TableItem] === "true" ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <CircleX className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                ) : (
                  <div
                    className={cn({
                      "w-[250px]": key === "statusMessage",
                    })}
                  >
                    {item[key as keyof TableItem]}
                  </div>
                )
              ) : (
                <Skeleton className="h-5" />
              )}
            </TableCell>
          )
      )}
      {!loading && (
        <TableCell className="w-[50px]">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </TableCell>
      )}
    </TableRow>
  );
}
