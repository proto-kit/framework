import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, Frown, List as ListIcon, Meh } from "lucide-react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import Pagination from "./pagination";
import { DropdownMenuCheckboxes } from "./ui/dropdown-menu-checkboxes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCallback, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormContext } from "react-hook-form";

export interface TableItemTitle {
  label: string;
  className?: string;
}

export interface ListProps<TableItem> {
  title: string;
  filters?: JSX.Element;
  loading: boolean;
  page: number;
  data?: {
    totalCount: string;
    items: TableItem[];
  };
  columns: Record<string, TableItemTitle>;
  dummyItem: TableItem;
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

export const showPerPage = 10;

export default function List<TableItem>({
  title,
  filters,
  page,
  loading,
  data,
  dummyItem,
  tableRow,
  columns,
  view,
  pagination,
  titleClassName,
}: ListProps<TableItem>) {
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const handlePopoverOpen = useCallback(() => {
    console.log("opening", areFiltersOpen);
    setAreFiltersOpen(true);
  }, []);
  const form = useFormContext();
  const searchParams = useSearchParams();

  const numberOfActiveFilters = useMemo(() => {
    const filters = searchParams.get("filters");
    if (!filters) return 0;
    return Array.from(new URLSearchParams(filters)).length;
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
                    onClick={handlePopoverOpen}
                  >
                    <Filter className="w-4 h-4 pr-1" />
                    {numberOfActiveFilters
                      ? `(${numberOfActiveFilters}) Filters`
                      : `Filters`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>{filters}</PopoverContent>
              </Popover>
            )}
            {/* <DropdownMenuCheckboxes
              onCheckedChange={onViewChange}
              items={Object.entries(columns).map(([value, label]) => ({
                label,
                value,
              }))}
              label={"View"}
              icon={<ListIcon className="h-4 w-4" />}
            /> */}
          </div>
        </div>

        {/* Table */}
        <Card className="w-full mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                {view.length ? (
                  Object.keys(columns).map((key, i) => (
                    <TableHead className={cn(columns[key].className)} key={i}>
                      {columns[key].label}
                    </TableHead>
                  ))
                ) : (
                  <></>
                )}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody className="cursor-pointer">
              {!loading
                ? data?.items.map((item, i) => tableRow(item, i, loading, view))
                : loadingData.items.map((item, i) =>
                    tableRow(dummyItem, i, true, view)
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
                  No data found
                </p>
              </div>
            </div>
          ) : (
            <></>
          )}
        </Card>

        {pagination !== false && (
          <div className="flex items-center w-full justify-between mt-4">
            {!loading && (data?.totalCount ?? 0 > 0) ? (
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
