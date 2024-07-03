"use client";
import List, { TableItemTitle, showPerPage } from "@/components/list";
import { useCallback } from "react";
import BlocksFilters from "@/components/blocks/blocks-filters";

import useQueryParams from "@/hooks/use-query-params";
import BlocksTableRow, {
  TableItem,
} from "@/components/blocks/blocks-table-row";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useQuery from "@/hooks/use-query";

export interface GetBlocksQueryResponse {
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
}

const columns: Record<keyof TableItem, TableItemTitle> = {
  height: {
    label: "Height",
  },
  hash: {
    label: "Hash",
  },
  transactions: {
    label: "Transactions",
  },
  stateRoot: {
    label: "State root",
  },
};

const formSchema = z.object({
  height: z.string().optional(),
  hash: z.string().optional(),
  hideEmpty: z.boolean().optional(),
});

export default function Blocks() {
  const [
    page,
    view,
    filters,
    setPage,
    setView,
    setFilters,
    clearQueryParamsFilters,
    filterString,
  ] = useQueryParams(columns);

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
    clearQueryParamsFilters();
    // set empty values manually, since default values correspond to the current filters on load
    form.setValue("height", "");
    form.setValue("hash", "");
    form.setValue("hideEmpty", false);
    form.trigger();
  }, [handleSubmit, clearQueryParamsFilters]);

  const skip = showPerPage * (page - 1);

  const [data, loading] = useQuery<GetBlocksQueryResponse>(
    `{
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
    }`
  );

  return (
    <>
      <Form {...form}>
        <form id="table" onSubmit={form.handleSubmit(handleSubmit)}>
          <List
            view={view}
            onViewChange={setView}
            filters={<BlocksFilters clearFilters={clearFilters} />}
            loading={loading}
            dummyItem={{
              block: {
                height: "0",
                hash: "0",
                txs: ["0"],
              },
              metadata: {
                stateRoot: "0",
              },
            }}
            tableRow={(item, i, loading, view) => {
              console.log("item", item);
              return (
                <BlocksTableRow
                  columns={columns}
                  key={i}
                  item={{
                    height: item.block.height,
                    hash: item.block.hash,
                    transactions: item.block.txs.length.toString(),
                    stateRoot: item.metadata.stateRoot,
                  }}
                  loading={loading}
                  view={view}
                />
              );
            }}
            page={page}
            data={data?.blocks}
            columns={columns}
            title={"Blocks"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
