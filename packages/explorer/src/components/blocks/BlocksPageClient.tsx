"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import BlocksFilters from "@/components/blocks/blocks-filters";
import useQueryParams from "@/hooks/use-query-params";
import BlocksTableRow, {
  TableItem,
} from "@/components/blocks/blocks-table-row";
import { Form } from "@/components/ui/form";
import List, { ListProps } from "@/components/list";
import config from "@/config";
import { showPerPage } from "@/components/pagination";
import { typed } from "@/lib/utils";

export interface GetBlocksQueryResponse {
  data: {
    blocks: {
      height: string;
      hash: string;
      fromStateRoot: string;
      _count: {
        transactions: number;
      };
    }[];
    aggregateBlock: {
      _count: {
        _all: number;
      };
    };
  };
}

const columns: Record<keyof TableItem, string> = {
  height: "Height",
  hash: "Hash",
  transactions: "Transactions",
  stateRoot: "State Root",
};

const formSchema = z.object({
  height: z.string().optional(),
  hash: z.string().optional(),
  hideEmpty: z.boolean().optional(),
});

export default function BlocksPageClient() {
  const querySchema = {
    height: "number",
    hash: "string",
    hideEmpty: "string",
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
      hash:
        filters?.hash != null && filters?.hash !== ""
          ? filters?.hash
          : undefined,
      height:
        filters?.height != null && filters?.height !== ""
          ? filters?.height
          : undefined,
      hideEmpty: filters?.hideEmpty != null && filters?.hideEmpty !== "",
    },
  });

  const handleSubmit = useCallback(
    (formData: z.infer<typeof formSchema>) => {
      setFilters({
        ...formData,
        hideEmpty: formData.hideEmpty === true ? "0" : undefined,
      });
      setPage(1);
    },
    [setFilters, setPage]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    form.setValue("height", "");
    form.setValue("hash", "");
    form.setValue("hideEmpty", false);
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
          if (key === "hideEmpty") {
            return `${filter} , OR: [{transactionsHash: {not: {equals: "0"}}}, 
                    {transactions: {some: {tx: {is: {isMessage: {equals: true}}}}}}]`;
          }

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
          blocks(take: ${showPerPage}, skip: ${skip},orderBy: {height: desc}, ${
            filterString !== initialFilterString ? `${filterString}}` : ""
          }){
            height
            hash
            fromStateRoot
            _count {
              transactions
            }
          }
          aggregateBlock ${
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
      const response = (await responseData.json()) as GetBlocksQueryResponse;
      setData({
        totalCount: response.data?.aggregateBlock?._count?._all.toString(),
        items: response?.data?.blocks?.map((item) => ({
          height: item.height,
          hash: item.hash,
          transactions: item._count?.transactions?.toString(),
          stateRoot: item.fromStateRoot,
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
            filters={<BlocksFilters clearFilters={clearFilters} />}
            loading={loading}
            tableRow={(item, i, isLoading, currentView) => (
              <BlocksTableRow
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
            title={"Blocks"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
/* eslint-enable no-underscore-dangle */
