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
import List, { ListProps } from "@/components/list";
import { useCallback, useEffect, useState } from "react";
import config from "@/config";
import Truncate from "react-truncate-inside/es";

export interface GetBlockQueryResponse {
  data: {
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
  const [data, setData] = useState<GetBlockQueryResponse["data"]>();
  const [loading, setLoading] = useState(true);
  const query = useCallback(async () => {
    setLoading(true);
    const skip = 0;

    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
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
        }`,
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = (await responseData.json()) as GetBlockQueryResponse;
      setData(response.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(undefined);
    }
  }, []);

  useEffect(() => {
    query();
  }, []);

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
