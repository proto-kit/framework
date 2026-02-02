"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@/components/ui/form";
import List, { ListProps } from "@/components/list";
import Filters from "@/components/ui/Filters";
import GenericTableRow from "@/components/ui/GenericTableRow";
import { FilterFieldDef } from "@/components/ui/FilterBuilder";

export interface DataTableConfig<TItem> {
  title: string;
  columns: Record<keyof TItem, string>;
  navigationPath?: string;
  copyKeys?: string[];
  columnRenderers?: Partial<
    Record<keyof TItem, (item: TItem) => React.ReactNode>
  >;
  items?: TItem[];
  totalCount?: string;
  loading?: boolean;
  filterFields?: FilterFieldDef[];
  formSchema?: z.ZodSchema;
  page?: number;
  filters?: Record<string, string | undefined>;
  view?: string[];
  onFiltersChange?: (filters: Record<string, string | undefined>) => void;
  onPageChange?: (page: number) => void;
  onViewChange?: (view: string[]) => void;
}

export default function DataTable<TItem>(config: DataTableConfig<TItem>) {
  const {
    title,
    columns,
    navigationPath,
    copyKeys,
    columnRenderers,
    items: externalItems,
    totalCount: externalTotalCount,
    loading: externalLoading,
    filterFields,
    formSchema,
    onFiltersChange,
    onPageChange,
    onViewChange,
    page,
    filters,
    view,
  } = config;

  const router = useRouter();

  const [loading, setLoading] = useState(externalLoading ?? false);
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (onPageChange) {
        onPageChange(newPage);
      }
    },
    [onPageChange]
  );

  const handleViewChange = useCallback(
    (newView: string[]) => {
      if (onViewChange) {
        onViewChange(newView);
      }
    },
    [onViewChange]
  );

  const handleFiltersChange = useCallback(
    (newFilters: Record<string, string | undefined>) => {
      if (onFiltersChange) {
        onFiltersChange(newFilters);
      }
    },
    [onFiltersChange]
  );

  const form = useForm({
    resolver: formSchema ? zodResolver(formSchema) : undefined,
    defaultValues:
      !filters || Object.keys(filters).length === 0
        ? {}
        : Object.fromEntries(
            Object.entries(filters)?.map(([key, value]) => [
              key,
              value != null && value !== "" ? value : undefined,
            ])
          ),
  });

  const handleSubmit = useCallback(
    (formData: Record<string, string | undefined>) => {
      const serialized = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [
          k,
          typeof v === "boolean" ? String(v) : v,
        ])
      );
      handleFiltersChange(serialized);
      handlePageChange(1);
    },
    [handleFiltersChange, handlePageChange]
  );

  const handleClearSubmit = useCallback(() => {
    if (filterFields) {
      handleSubmit({});
    }
  }, [filterFields, handleSubmit, form]);

  useEffect(() => {
    setLoading(externalLoading ?? false);
  }, [externalLoading]);

  const handleRowClick = useCallback(
    (item: TItem) => {
      if (navigationPath != null) {
        const path = navigationPath.replace(/\{(\w+)\}/g, (_, key) => {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const value = item[key as keyof TItem];
          return value != null ? String(value) : "";
        });

        router.push(path);
      }
    },
    [navigationPath, router]
  );

  const data: ListProps<TItem>["data"] = {
    items: externalItems ?? [],
    totalCount: externalTotalCount ?? "0",
  };

  return (
    <>
      <Form {...form}>
        <form
          id="table"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="w-full"
        >
          <List
            view={view || []}
            onViewChange={handleViewChange}
            filters={
              filterFields ? (
                <Filters fields={filterFields} onSubmit={handleClearSubmit} />
              ) : undefined
            }
            loading={loading}
            tableRow={(item, i, isLoading, currentView) => (
              <GenericTableRow
                columns={columns}
                key={i}
                item={item}
                loading={isLoading}
                view={currentView}
                onRowClick={() => handleRowClick(item)}
                copyKeys={copyKeys}
                columnRenderers={columnRenderers}
              />
            )}
            page={page != null ? page : 0}
            data={data}
            columns={columns}
            title={title}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
