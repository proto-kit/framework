"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Meh } from "lucide-react";
import { useFormContext } from "react-hook-form";

import Pagination from "./pagination";
import { Card } from "./ui/card";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn, typed } from "@/lib/utils";

export interface ListProps<TableItem> {
  title: string;
  filters?: JSX.Element;
  loading: boolean;
  page: number;
  data?: {
    totalCount: string;
    items: TableItem[];
  };
  columns: Record<string, string>;
  tableRow: (
    item: TableItem,
    i: number,
    loading: boolean,
    view: string[]
  ) => JSX.Element;
  onViewChange: (view: string[]) => void;
  view: string[];
  hasDetails?: boolean;
  pagination?: boolean;
  titleClassName?: string;
}

export default function List<TableItem>({
  title,
  filters,
  page,
  loading,
  data,
  tableRow,
  columns,
  view,
  pagination,
  titleClassName,
}: ListProps<TableItem>) {
  const form = useFormContext();
  const searchParams = useSearchParams();

  const numberOfActiveFilters = useMemo(() => {
    const activeFilters = searchParams.get("filters");
    if (activeFilters == null) return 0;
    return Array.from(new URLSearchParams(activeFilters)).length;
  }, [form.watch()]);

  const loadingData = {
    totalCount: "5",
    // @ts-ignore
    items: [{}, {}, {}, {}, {}],
  };

  return (
    <div className="flex flex-col justify-center items-center h-full max-w-full w-full">
      <div className="flex flex-col w-full items-center justify-center">
        {/* Header */}
        <div className="flex w-full justify-between items-center">
          <div>
            <h1
              className={cn(
                "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
                titleClassName
              )}
            >
              {title}
            </h1>
          </div>

          <div className="flex gap-2">
            {filters && (
              <Popover>
                <PopoverTrigger asChild={true}>
                  <Button
                    variant={numberOfActiveFilters ? "default" : "outline"}
                  >
                    <Filter className="w-4 h-4 pr-1" />
                    {numberOfActiveFilters
                      ? `(${numberOfActiveFilters}) Filters`
                      : "Filters"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>{filters}</PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="w-full mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {view.length ? (
                  Object.keys(columns).map((key, i) => (
                    <TableHead
                      className={cn({
                        "w-[100px]": i === 0,
                      })}
                      key={i}
                    >
                      {columns[key]}
                    </TableHead>
                  ))
                ) : (
                  <></>
                )}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody className="cursor-pointer">
              {!loading
                ? data?.items.map((item, i) => tableRow(item, i, loading, view))
                : loadingData.items.map((item, i) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    tableRow(typed<any>(item), i, true, view)
                  )}
            </TableBody>
          </Table>
          {!loading && (data?.items.length === 0 || view.length === 0) ? (
            <div className="h-full w-full min-h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <Meh
                  strokeWidth={1}
                  className="h-16 w-16 text-muted-foreground"
                />
                <p className="text-center text-muted-foreground text-md">
                  No data found, <br />
                  try changing the filters.
                </p>
              </div>
            </div>
          ) : (
            <></>
          )}
        </Card>

        {pagination !== false && (
          <div className="flex items-center w-full justify-between mt-4">
            {!loading && (Number(data?.totalCount) ?? 0) > 0 ? (
              <p className="text-sm text-muted-foreground w-full">
                Available entries: {data?.totalCount ?? "0"}
              </p>
            ) : (
              <></>
            )}
            <Pagination
              page={page}
              totalCount={Number(data?.totalCount ?? "0")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
