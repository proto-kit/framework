"use client";

/* eslint-disable no-nested-ternary */

import React from "react";
import { ChevronRight, CircleCheck, CircleX } from "lucide-react";

import { TableCell, TableRow } from "./table";
import { Skeleton } from "./skeleton";
import Copy from "./copy-to-clipboard";

import { typed } from "@/lib/utils";

export interface GenericTableRowProps<Item> {
  columns: Record<string, string>;
  view: string[];
  loading: boolean;
  item: Item;
  copyKeys?: string[];
  statusKey?: string;
  onRowClick?: () => void;
}

export default function GenericTableRow<Item>({
  columns,
  view,
  loading,
  item,
  onRowClick,
  copyKeys = [],
  statusKey,
}: GenericTableRowProps<Item>) {
  return (
    <TableRow onClick={onRowClick}>
      {Object.keys(columns).map(
        (_key) =>
          view.includes(_key) && (
            <TableCell className={""} key={_key}>
              {!loading ? (
                copyKeys.includes(_key) ? (
                  <Copy text={String(item[typed<keyof Item>(_key)])} />
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
/* eslint-enable no-nested-ternary */
