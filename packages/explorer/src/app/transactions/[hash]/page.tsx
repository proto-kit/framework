"use client";
import { Card } from "@/components/ui/card";
import { CircleCheck, CircleX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DetailsLayout } from "@/components/details/layout";
import TransactionsTableRow, {
  TableItem,
} from "@/components/transactions/transactions-table-row";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import List, { ListProps } from "@/components/list";
import { useCallback, useEffect, useState } from "react";
import config from "@/config";
import Truncate from "react-truncate-inside/es";
import useQuery from "@/hooks/use-query";

export interface GetTransactionQueryResponse {
  transactions: {
    totalCount: string;
    items: (
      | {
          tx: {
            hash: string;
            sender: string;
            methodId: string;
            nonce: string;
          };
          status: boolean;
          statusMessage?: string;
        }
      | undefined
    )[];
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

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();

  const [data, loading] = useQuery<GetTransactionQueryResponse>(`{
      transactions(take: 1, skip: 0, hash: "${params.hash}"){
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
    }`);

  const details = [
    {
      label: "Nonce",
      value: data?.transactions.items[0]?.tx.nonce ?? "—",
    },
    {
      label: "Status",
      value: (
        <div className="mt-1">
          {data?.transactions.items[0]?.status ? (
            <CircleCheck className="w-4 h-4 text-green-500" />
          ) : (
            <CircleX className="w-4 h-4 text-red-500" />
          )}
        </div>
      ),
    },
    {
      label: "Status message",
      value: data?.transactions.items[0]?.statusMessage ?? "—",
    },
    {
      label: "Method ID",
      value: data?.transactions.items[0]?.tx.methodId ?? "—",
    },
    {
      label: "Hash",
      value: data?.transactions.items[0]?.tx.hash ?? "—",
    },
    {
      label: "Sender",
      value: data?.transactions.items[0]?.tx.sender ?? "—",
    },
  ];

  const form = useForm();

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Transaction{" "}
          {!loading && (
            <Truncate
              text={data?.transactions.items[0]?.tx.hash ?? ""}
              width={500}
            />
          )}
        </div>
      }
      details={details}
      loading={loading}
    >
      <></>
      {/* <Form {...form}>
        <form
          id="table"
          className="w-full"
          onSubmit={form.handleSubmit(() => {})}
        >
          <List
            view={Object.keys(columns)}
            onViewChange={() => {}}
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
            page={0}
            data={{
              totalCount: "0",
              items:
                data?.blocks.items[0]?.block.txs.map((tx) => ({
                  ...tx.tx,
                  status: `${tx.status}`,
                  statusMessage: tx.statusMessage ?? "—",
                })) ?? [],
            }}
            columns={columns}
            title={"Transactions"}
            titleClassName="text-4xl lg:text-4xl"
            hasDetails={true}
            pagination={false}
          />
        </form>
      </Form> */}
    </DetailsLayout>
  );
}
