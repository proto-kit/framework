"use client";

/* eslint-disable no-nested-ternary */

import React from "react";
import { ChevronRight } from "lucide-react";

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
  columnRenderers?: Partial<
    Record<keyof Item, (item: Item) => React.ReactNode>
  >;
  onRowClick?: () => void;
}

export default function GenericTableRow<Item>({
  columns,
  view,
  loading,
  item,
  onRowClick,
  copyKeys = [],
  columnRenderers,
}: GenericTableRowProps<Item>) {
  return (
    <TableRow onClick={onRowClick}>
      {Object.keys(columns).map(
        (_key) =>
          view.includes(_key) && (
            <TableCell className={""} key={_key}>
              {!loading ? (
                columnRenderers && _key in columnRenderers ? (
                  columnRenderers[typed<keyof Item>(_key)]?.(item)
                ) : copyKeys.includes(_key) ? (
                  <Copy text={String(item[typed<keyof Item>(_key)])} />
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
