"use client";
import { Card } from "@/components/ui/card";
import { CircleCheck } from "lucide-react";
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
import List, { ListProps, TableItemTitle } from "@/components/list";
import { useCallback, useEffect, useState } from "react";
import config from "@/config";
import Truncate from "react-truncate-inside/es";
import useQuery from "@/hooks/use-query";

export interface GetBlockQueryResponse {
  blocks: {
    items: (
      | {
          block: {
            hash: string;
            txs: {
              tx: {
                hash: string;
                sender: string;
                methodId: string;
                nonce: string;
              };
              status: boolean;
              statusMessage?: string;
            }[];
            height: string;
          };
          metadata: {
            stateRoot: string;
          };
        }
      | undefined
    )[];
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

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();
  const [data, loading] = useQuery<GetBlockQueryResponse>(`{
    blocks(take: 1, skip: 0, hash: "${params.hash}"){
      totalCount,
      items {
        block {
          height,
          hash,
          txs {
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
        metadata {
          stateRoot
        }
      }
    }
  }`);

  const details = [
    {
      label: "Height",
      value: data?.blocks.items[0]?.block.height ?? "—",
    },
    {
      label: "Transactions",
      value: `${data?.blocks.items[0]?.block.txs.length ?? "—"}`,
    },
    {
      label: "Hash",
      value: data?.blocks.items[0]?.block.hash ?? "—",
    },
    {
      label: "Hash",
      value: data?.blocks.items[0]?.block.hash ?? "—",
    },
  ];

  const form = useForm();

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Block {!loading && <>#{data?.blocks.items[0]?.block.height}</>}
        </div>
      }
      details={details}
      loading={loading}
    >
      <Form {...form}>
        <form
          id="table"
          className="w-full"
          onSubmit={form.handleSubmit(() => {})}
        >
          <List
            view={Object.keys(columns)}
            onViewChange={() => {}}
            loading={loading}
            dummyItem={{
              hash: "0",
              sender: "0",
              status: "0",
              statusMessage: "",
              methodId: "0",
              nonce: "0",
            }}
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
      </Form>
    </DetailsLayout>
  );
}
