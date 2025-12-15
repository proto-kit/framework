"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import BatchesFilters from "@/components/batches/batches-filters";
import useQueryParams from "@/hooks/use-query-params";
import BatchesTableRow, {
  TableItem,
} from "@/components/batches/batches-table-row";
import { Form } from "@/components/ui/form";
import List, { ListProps } from "@/components/list";
import config from "@/config";
import { showPerPage } from "@/components/pagination";
import { typed } from "@/lib/utils";

export interface GetBatchesQueryResponse {
  data: {
    batches: {
      height: string;
      settlementTransactionHash: string;
      _count: {
        blocks: number;
      };
    }[];
    aggregateBatches: {
      _count: {
        _all: number;
      };
    };
  };
}

const columns: Record<keyof TableItem, string> = {
  height: "Height",
  blocks: "Blocks",
  settlementTransactionHash: "Settlement Transaction Hash",
};

const formSchema = z.object({
  height: z.string().optional(),
  settlementTransactionHash: z.string().optional(),
});

export default function BatchesPageClient() {
  const querySchema = {
    height: "number",
    settlementTransactionHash: "string",
  } as const;

  const [page, view, filters, setPage, setView, setFilters] = useQueryParams(
    columns,
    querySchema
  );
  const [data, setData] = useState<ListProps<TableItem>["data"]>();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      settlementTransactionHash:
        filters?.settlementTransactionHash != null &&
        filters?.settlementTransactionHash !== ""
          ? filters?.settlementTransactionHash
          : undefined,
      height:
        filters?.height != null && filters?.height !== ""
          ? filters?.height
          : undefined,
    },
  });

  const handleSubmit = useCallback(
    (formData: z.infer<typeof formSchema>) => {
      setFilters(formData);
      setPage(1);
    },
    [setFilters, setPage]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    form.setValue("height", "");
    form.setValue("settlementTransactionHash", "");
    void form.trigger();
  }, [setFilters, form]);

  const query = useCallback(async () => {
    setLoading(true);

    const skip = showPerPage * (page - 1);
    const initialFilterString = "where : {";
    const filterString = Object.entries(filters).reduce(
      (filter, [key, value]) => {
        if (value != null) {
          const fieldType = querySchema[typed<keyof typeof querySchema>(key)];
          const quotedValue = fieldType === "string" ? `"${value}"` : value;
          return `${filter} , ${key}: {equals: ${quotedValue}}`;
        }
        return filter;
      },
      initialFilterString
    );

    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          batches(take: ${showPerPage}, skip: ${skip},orderBy: {height: desc}, ${
            filterString !== initialFilterString ? `${filterString}}` : ""
          }){
            settlementTransactionHash
            height
            _count {
              blocks
            }
          }
          aggregateBatch ${
            filterString !== initialFilterString ? `(${filterString}})` : ""
          } {
            _count {
              _all
            }
          }
        }`,
      }),
    });
    try {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const response = (await responseData.json()) as GetBatchesQueryResponse;
      setData({
        totalCount: response.data?.aggregateBatches?._count?._all.toString(),
        items: response?.data?.batches?.map((item) => ({
          height: item.height,
          settlementTransactionHash: item.settlementTransactionHash,
          blocks: item._count?.blocks?.toString(),
        })),
      });
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(undefined);
    }
  }, [filters, page]);

  useEffect(() => {
    void query();
  }, [filters, page]);

  return (
    <>
      <Form {...form}>
        <form id="table" onSubmit={form.handleSubmit(handleSubmit)}>
          <List
            view={view}
            onViewChange={setView}
            filters={<BatchesFilters clearFilters={clearFilters} />}
            loading={loading}
            tableRow={(item, i, isLoading, currentView) => (
              <BatchesTableRow
                columns={columns}
                key={i}
                item={item}
                loading={isLoading}
                view={currentView}
              />
            )}
            page={page}
            data={data}
            columns={columns}
            title={"Batches"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
/* eslint-enable no-underscore-dangle */
