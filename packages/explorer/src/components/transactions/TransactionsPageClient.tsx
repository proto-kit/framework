"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import config from "@/config";
import List, { ListProps } from "@/components/list";
import { showPerPage } from "@/components/pagination";
import useQueryParams from "@/hooks/use-query-params";
import TransactionsTableRow, {
  TableItem,
} from "@/components/transactions/transactions-table-row";
import { Form } from "@/components/ui/form";
import TransactionsFilters from "@/components/transactions/transactions-filters";

export interface GetTransactionsQueryResponse {
  data: {
    transactions: {
      hash: string;
      sender: string;
      methodId: string;
      nonce: string;
      executionResult: {
        status: boolean;
        statusMessage?: string;
      };
    }[];
    aggregateTransaction: {
      _count: {
        _all: number;
      };
    };
  };
}

const columns: Record<keyof TableItem, string> = {
  hash: "Hash",
  methodId: "Method ID",
  sender: "Sender",
  nonce: "Nonce",
  status: "Status",
  statusMessage: "Status Message",
};

const formSchema = z.object({
  methodId: z.string().optional(),
  sender: z.string().optional(),
  hash: z.string().optional(),
});

export default function TransactionsPageClient() {
  const querySchema = {
    methodId: "string",
    sender: "string",
    hash: "string",
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
      methodId:
        filters?.methodId != null && filters?.methodId !== ""
          ? filters?.methodId
          : undefined,
      sender:
        filters?.sender != null && filters?.sender !== ""
          ? filters?.sender
          : undefined,
    },
  });

  const handleSubmit = useCallback(
    (formData: z.infer<typeof formSchema>) => {
      setFilters({
        ...formData,
      });
      setPage(1);
    },
    [setFilters, setPage]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    form.setValue("sender", "");
    form.setValue("hash", "");
    form.setValue("methodId", "");
    void form.trigger();
  }, [setFilters, form]);

  const query = useCallback(async () => {
    setLoading(true);

    const skip = showPerPage * (page - 1);
    const initialFilterString = "where : { ";

    const filterString = Object.entries(filters).reduce(
      (filter, [key, value]) => {
        if (value != null) {
          return `${filter}, ${key}: {equals: "${value}"}`;
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
          transactions(take: ${showPerPage}, skip: ${skip}, ${
            filterString !== initialFilterString ? `${filterString}}` : ""
          }){
            methodId
            hash
            nonce
            sender
            executionResult {
              status
              statusMessage
            }
          }
          aggregateTransaction ${
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
      const response =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (await responseData.json()) as GetTransactionsQueryResponse;

      setData({
        totalCount: response.data.aggregateTransaction._count._all.toString(),
        items: response.data.transactions?.map((item) => ({
          hash: item.hash,
          methodId: item.methodId,
          sender: item.sender,
          nonce: item.nonce,
          status: item.executionResult.status ? "true" : "false",
          statusMessage: item.executionResult.statusMessage ?? "—",
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
            filters={<TransactionsFilters clearFilters={clearFilters} />}
            loading={loading}
            tableRow={(item, i, isLoading, currentView) => (
              <TransactionsTableRow
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
            title={"Transactions"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
/* eslint-enable no-underscore-dangle */
