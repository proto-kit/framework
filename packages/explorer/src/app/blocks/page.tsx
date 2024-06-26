"use client";
import { useSearchParams } from "next/navigation";
import List, { ListProps, showPerPage } from "@/components/list";
import { useCallback, useEffect, useState } from "react";
import BlocksFilters from "@/components/blocks/blocks-filters";

import useQueryParams from "@/hooks/use-query-params";
import BlocksTableRow, {
  TableItem,
} from "@/components/blocks/blocks-table-row";
import { Form } from "@/components/ui/form";
import { set, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import config from "@/config";

export interface GetBlocksQueryResponse {
  data: {
    blocks: {
      totalCount: string;
      items: {
        block: {
          hash: string;
          txs: string[];
          height: string;
        };
        metadata: {
          stateRoot: string;
        };
      }[];
    };
  };
}

const columns: Record<keyof TableItem, string> = {
  height: "Height",
  hash: "Hash",
  transactions: "Transactions",
  stateRoot: "State root",
};

const formSchema = z.object({
  height: z.string().optional(),

  hash: z.string().optional(),
  hideEmpty: z.boolean().optional(),
});

export default function Blocks() {
  const searchParams = useSearchParams();

  const [page, view, filters, setPage, setView, setFilters] =
    useQueryParams(columns);
  const [data, setData] = useState<ListProps<TableItem>["data"]>();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hash: filters["hash"] || undefined,
      height: filters["height"] || undefined,
      hideEmpty: filters["hideEmpty"] === "true",
    },
  });

  const handleSubmit = useCallback((data: z.infer<typeof formSchema>) => {
    setFilters({
      ...data,
      hideEmpty: data.hideEmpty ? "true" : undefined,
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    form.setValue("height", "");
    form.setValue("hash", "");
    form.setValue("hideEmpty", false);
    form.trigger();
  }, [handleSubmit]);

  const query = useCallback(async () => {
    setLoading(true);

    const skip = showPerPage * (page - 1);

    const filterString = Object.entries(filters).reduce(
      (filterString, [key, value]) => {
        if (value) {
          return (
            filterString + `, ${key}: ${value === "true" ? true : `"${value}"`}`
          );
        }
        return filterString;
      },
      ""
    );

    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          blocks(take: ${showPerPage}, skip: ${skip} ${filterString ? `${filterString}` : ""}){
            totalCount,
            items {
              block {
                height,
                hash,
                txs {
                  tx {
                    hash
                  }
                }
              }
              metadata {
                stateRoot
              }
            }
          }
        }`,
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = (await responseData.json()) as GetBlocksQueryResponse;

      setData({
        totalCount: response.data.blocks.totalCount,
        items: response.data.blocks.items.map((item) => ({
          height: item.block.height,
          hash: item.block.hash,
          transactions: item.block.txs.length.toString(),
          stateRoot: item.metadata.stateRoot,
        })),
      });
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(undefined);
    }
  }, [searchParams, filters, page]);

  useEffect(() => {
    query();
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
            tableRow={(item, i, loading, view) => (
              <BlocksTableRow
                columns={columns}
                key={i}
                item={item}
                loading={loading}
                view={view}
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
