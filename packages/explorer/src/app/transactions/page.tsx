"use client";

import { useSearchParams } from "next/navigation";
import List, {
  ListProps,
  TableItemTitle,
  showPerPage,
} from "@/components/list";
import { useCallback, useEffect, useState } from "react";

import useQueryParams from "@/hooks/use-query-params";
import TransactionsTableRow, {
  TableItem,
} from "@/components/transactions/transactions-table-row";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import TransactionsFilters from "@/components/transactions/transactions-filters";
import config from "../../config";

export interface GetBlocksQueryResponse {
  data: {
    transactions: {
      totalCount: string;
      items: {
        tx: {
          hash: string;
          sender: string;
          methodId: string;
          nonce: string;
        };
        status: boolean;
        statusMessage?: string;
      }[];
    };
  };
}

const columns: Record<keyof TableItem, TableItemTitle> = {
  hash: { label: "Hash" },
  methodId: { label: "Method ID" },
  sender: { label: "Sender" },
  nonce: { label: "Nonce" },
  status: { label: "Status" },
  statusMessage: { label: "Status Message" },
};

const formSchema = z.object({
  methodId: z.string().optional(),
  sender: z.string().optional(),
  hash: z.string().optional(),
});

export default function Transactions() {
  const searchParams = useSearchParams();

  const [page, view, filters, setPage, setView, setFilters] =
    useQueryParams(columns);
  const [data, setData] = useState<ListProps<TableItem>["data"]>();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hash: filters["hash"] || undefined,
      methodId: filters["methodId"] || undefined,
      sender: filters["sender"] || undefined,
    },
  });

  const handleSubmit = useCallback((data: z.infer<typeof formSchema>) => {
    console.log("submit", data);
    setFilters({
      ...data,
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    form.setValue("sender", "");
    form.setValue("hash", "");
    form.setValue("methodId", "");
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
          transactions(take: ${showPerPage}, skip: ${skip} ${filterString ? `${filterString}` : ""}){
            totalCount,
            items {
              tx {
                hash,
                methodId,
                sender,
                nonce
              },
              status,
              statusMessage
            }
          }
        }`,
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = (await responseData.json()) as GetBlocksQueryResponse;

      setData({
        totalCount: response.data.transactions.totalCount,
        items: response.data.transactions.items.map((item) => ({
          hash: item.tx.hash,
          methodId: item.tx.methodId,
          sender: item.tx.sender,
          nonce: item.tx.nonce,
          status: item.status ? "true" : "false",
          statusMessage: item.statusMessage ?? "—",
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
            filters={<TransactionsFilters clearFilters={clearFilters} />}
            loading={loading}
            tableRow={(item, i, loading, view) => (
              <TransactionsTableRow
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
            title={"Transactions"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
