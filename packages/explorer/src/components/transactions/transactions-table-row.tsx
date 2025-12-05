/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-underscore-dangle */

import { useRouter } from "next/navigation";
import Truncate from "react-truncate-inside";
import { ChevronRight, CircleCheck, CircleX, Clipboard } from "lucide-react";
import { useState } from "react";

import { TableCell, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";

import { cn, typed } from "@/lib/utils";

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
  columns: Record<string, string>;
  view: string[];
  loading: boolean;
  item: TableItem;
}
export default function TransactionsTableRow({
  columns,
  view,
  loading,
  item,
}: TableRowProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<Record<any, any>>({});

  return (
    <TableRow onClick={() => router.push(`/transactions/${item.hash}`)}>
      {Object.keys(columns).map(
        (_key) =>
          view.includes(_key) && (
            <TableCell className={""} key={_key}>
              {
                // eslint-disable-next-line no-nested-ternary
                !loading ? (
                  // eslint-disable-next-line no-nested-ternary
                  _key === "hash" ||
                  _key === "methodId" ||
                  _key === "sender" ? (
                    <div
                      className="flex gap-1.5 items-center group relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        void navigator.clipboard.writeText(
                          item[typed<keyof TableItem>(_key)]
                        );
                        setCopied({
                          [_key]: true,
                        });
                        setTimeout(
                          () =>
                            setCopied({
                              [_key]: false,
                            }),
                          2000
                        );
                      }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute w-full rounded-md flex items-center justify-start bg-gray-50">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clipboard className="w-4 h-4  text-muted-foreground" />
                          <span className="text-md">
                            {copied[_key] === false || copied[_key] == null
                              ? "Click to copy"
                              : "Copied successfully!"}
                          </span>
                        </div>
                      </div>
                      <div className="group-hover:opacity-0">
                        <Truncate
                          text={item[typed<keyof TableItem>(_key)]}
                          width={150}
                          // offset={item[key as keyof TableItem].length / 2 - 3}
                        />
                      </div>
                    </div>
                  ) : _key === "status" ? (
                    <div className="flex w-full items-center justify-center">
                      {item[typed<keyof TableItem>(_key)] === "true" ? (
                        <CircleCheck className="w-4 h-4 text-green-500" />
                      ) : (
                        <CircleX className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  ) : (
                    <div
                      className={cn({
                        "w-[250px]": _key === "statusMessage",
                      })}
                    >
                      {item[typed<keyof TableItem>(_key)]}
                    </div>
                  )
                ) : (
                  <Skeleton className="h-5" />
                )
              }
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
/* eslint-enable sonarjs/cognitive-complexity */
/* eslint-enable no-underscore-dangle */
