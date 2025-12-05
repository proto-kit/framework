"use client";

import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";

import { DetailsLayout } from "@/components/details/layout";
import TransactionsTableRow, {
  TableItem,
} from "@/components/transactions/transactions-table-row";
import { Form } from "@/components/ui/form";
import List from "@/components/list";
import config from "@/config";

export interface GetBlockQueryResponse {
  data: {
    block:
      | {
          hash: string;
          height: string;
          fromStateRoot: string;
          transactions: {
            tx: {
              hash: string;
              sender: string;
              methodId: string;
              nonce: string;
            };
            status: boolean;
            statusMessage?: string;
          }[];
        }
      | undefined;
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

function typed<T>(v: any): T {
  return v;
}

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();
  const [data, setData] = useState<GetBlockQueryResponse["data"]>();
  const [loading, setLoading] = useState(true);
  const query = useCallback(async () => {
    setLoading(true);

    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
              block (where: {hash: "${params.hash}"}) {
                height
                hash
                fromStateRoot
                transactions {
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
    try {
      const response = typed<GetBlockQueryResponse>(await responseData.json());
      setData(response.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(undefined);
    }
  }, []);

  useEffect(() => {
    void query();
  }, []);

  const details = [
    {
      label: "Height",
      value: data?.block?.height ?? "—",
    },
    {
      label: "Transactions",
      value: `${data?.block?.transactions?.length ?? "—"}`,
    },
    {
      label: "Hash",
      value: data?.block?.hash ?? "—",
    },
    {
      label: "StateRoot",
      value: data?.block?.fromStateRoot ?? "—",
    },
  ];

  const form = useForm();

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Block {!loading && <>#{data?.block?.height}</>}
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
            tableRow={(item, i, rowLoading, view) => (
              <TransactionsTableRow
                columns={columns}
                key={i}
                item={item}
                loading={rowLoading}
                view={view}
              />
            )}
            page={0}
            data={{
              totalCount: "0",
              items:
                data?.block?.transactions?.map((tx) => ({
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
