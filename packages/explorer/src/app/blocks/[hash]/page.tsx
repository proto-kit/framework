"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DetailsLayout } from "@/components/details/layout";
import DataTable from "@/components/ui/DataTable";
import config from "@/config";
import { typed } from "@/lib/utils";
import {
  columns,
  TableItem,
} from "@/components/transactions/TransactionsPageClient";

export interface GetBlockQueryResponse {
  data: {
    block:
      | {
          hash: string;
          height: string;
          result: {
            stateRoot: string;
          };
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

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();
  const [data, setData] = useState<GetBlockQueryResponse["data"]>();
  const [loading, setLoading] = useState(true);

  const query = useCallback(async () => {
    setLoading(true);

    const queryStr = `query GetBlock($hash: String!) {
      block(where: { hash: $hash }) {
        height
        hash
        result { stateRoot }
        transactions {
          tx { hash, methodId, sender, nonce }
          status
          statusMessage
        }
      }
    }`;

    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: queryStr,
        variables: { hash: params.hash },
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
  }, [params.hash]);

  useEffect(() => {
    void query();
  }, [query]);

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
      value: data?.block?.result.stateRoot ?? "—",
    },
  ];

  const transactions: TableItem[] = (data?.block?.transactions || []).map(
    (tx) => ({
      ...tx.tx,
      status: {
        isSuccess: tx.status === true,
        message: tx.statusMessage,
      },
    })
  );

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
      <DataTable
        view={Object.keys(columns)}
        title="Transactions"
        columns={columns}
        items={transactions}
        totalCount={transactions.length.toString()}
        loading={loading}
        navigationPath="/transactions/{hash}"
        copyKeys={["hash", "methodId", "sender"]}
      />
    </DetailsLayout>
  );
}
