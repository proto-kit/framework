/* eslint-disable no-underscore-dangle */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Clipboard } from "lucide-react";
import Truncate from "react-truncate-inside";

import { TableCell, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";

import { typed } from "@/lib/utils";

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
  columns,
  view,
  loading,
  item,
}: TableRowProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<Record<any, any>>({});

  return (
    <TableRow onClick={() => router.push(`/blocks/${item.hash}`)}>
      {Object.keys(columns).map(
        (_key) =>
          view.includes(_key) && (
            <TableCell className={""} key={_key}>
              {
                // eslint-disable-next-line no-nested-ternary
                !loading ? (
                  _key === "hash" || _key === "stateRoot" ? (
                    <div
                      className="flex gap-1.5 items-center group relative"
                      onClick={(e) => {
                        if (_key === "hash" || _key === "stateRoot") {
                          e.stopPropagation();
                          e.preventDefault();
                        }
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
                        />
                      </div>
                    </div>
                  ) : (
                    <>{item[typed<keyof TableItem>(_key)]}</>
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
/* eslint-enable no-underscore-dangle */
