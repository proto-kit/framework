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
import useQuery from "@/hooks/use-query";

export interface GetTransactionsQueryResponse {
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
      methodId: filters["methodId"] || undefined,
      sender: filters["sender"] || undefined,
    },
  });

  const handleSubmit = useCallback((data: z.infer<typeof formSchema>) => {
    setFilters({
      ...data,
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    clearQueryParamsFilters();
    form.setValue("sender", "");
    form.setValue("hash", "");
    form.setValue("methodId", "");
    form.trigger();
  }, [handleSubmit, clearQueryParamsFilters]);

  const skip = showPerPage * (page - 1);

  const [data, loading] = useQuery<GetTransactionsQueryResponse>(
    `{
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
    }`
  );

  return (
    <>
      <Form {...form}>
        <form id="table" onSubmit={form.handleSubmit(handleSubmit)}>
          <List
            view={view}
            onViewChange={setView}
            filters={<TransactionsFilters clearFilters={clearFilters} />}
            loading={loading}
            dummyItem={{
              tx: {
                hash: "0",
                methodId: "0",
                sender: "0",
                nonce: "0",
              },
              status: true,
              statusMessage: "0",
            }}
            tableRow={(item, i, loading, view) => {
              console.log("item", item);

              return (
                <TransactionsTableRow
                  columns={columns}
                  key={i}
                  item={{
                    hash: item.tx.hash,
                    methodId: item.tx.methodId,
                    sender: item.tx.sender,
                    nonce: item.tx.nonce,
                    status: item.status ? "true" : "false",
                    statusMessage: item.statusMessage ?? "—",
                  }}
                  loading={loading}
                  view={view}
                />
              );
            }}
            page={page}
            data={data?.transactions}
            columns={columns}
            title={"Transactions"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
