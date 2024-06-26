import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import Truncate from "react-truncate-inside";
import { ChevronRight, Clipboard } from "lucide-react";
import { useState } from "react";

export interface TableItem {
  height: string;
  hash: string;
  transactions: string;
  stateRoot: string;
}

export interface TableRowProps {
  key: number;
  columns: Record<string, string>;
  view: string[];
  loading: boolean;
  item: TableItem;
}
export default function BlocksTableRow({
  key,
  columns,
  view,
  loading,
  item,
}: TableRowProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<Record<any, any>>({});

  return (
    <TableRow key={key} onClick={() => router.push(`/blocks/${item.hash}`)}>
      {Object.keys(columns).map(
        (key) =>
          view.includes(key) && (
            <TableCell className={""}>
              {!loading ? (
                key === "hash" || key === "stateRoot" ? (
                  <div
                    className="flex gap-1.5 items-center group relative"
                    onClick={(e) => {
                      if (key === "hash" || key === "stateRoot") {
                        e.stopPropagation();
                        e.preventDefault();
                      }
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
                      />
                    </div>
                  </div>
                ) : (
                  <>{item[key as keyof TableItem]}</>
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
