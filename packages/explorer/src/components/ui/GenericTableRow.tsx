"use client";

import React, { useState } from "react";
import Truncate from "react-truncate-inside";
import { ChevronRight, Clipboard, CircleCheck, CircleX } from "lucide-react";

import { TableCell, TableRow } from "./table";
import { Skeleton } from "./skeleton";

import { typed } from "@/lib/utils";

export interface GenericTableRowProps<Item extends Record<string, any>> {
  columns: Record<string, string>;
  view: string[];
  loading: boolean;
  item: Item;
  onRowClick?: () => void;
  copyKeys?: string[];
  statusKey?: string;
  cellRenderer?: (key: string, value: any, item: Item) => React.ReactNode;
}

export default function GenericTableRow<Item extends Record<string, any>>({
  columns,
  view,
  loading,
  item,
  onRowClick,
  copyKeys = [],
  statusKey,
  cellRenderer,
}: GenericTableRowProps<Item>) {
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  return (
    <TableRow onClick={onRowClick}>
      {Object.keys(columns).map(
        (_key) =>
          view.includes(_key) && (
            <TableCell className={""} key={_key}>
              {!loading ? (
                cellRenderer ? (
                  cellRenderer(_key, item[typed<keyof Item>(_key)], item)
                ) : copyKeys.includes(_key) ? (
                  <div
                    className="flex gap-1.5 items-center group relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void navigator.clipboard.writeText(
                        String(item[typed<keyof Item>(_key)])
                      );
                      setCopied((s) => ({ ...s, [_key]: true }));
                      setTimeout(() => setCopied((s) => ({ ...s, [_key]: false })), 2000);
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
                        text={String(item[typed<keyof Item>(_key)])}
                        width={150}
                      />
                    </div>
                  </div>
                ) : statusKey === _key ? (
                  <div className="flex w-full items-center justify-center">
                    {String(item[typed<keyof Item>(_key)]) === "true" ? (
                      <CircleCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <CircleX className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                ) : (
                  <>{String(item[typed<keyof Item>(_key)])}</>
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
