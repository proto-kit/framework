"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Truncate from "react-truncate-inside/es";

import { DetailsLayout } from "@/components/details/layout";
import config from "@/config";

interface Transaction {
  hash: string;
  sender: string;
  methodId: string;
  nonce: string;
  executionResult: {
    status: boolean;
    statusMessage?: string;
    block: {
      batch: {
        proof: string | null;
        settlementTransactionHash: string | null;
      };
    };
  };
  status: boolean;
  statusMessage?: string;
}
export interface GetTransactionQueryResponse {
  data: {
    transaction: Transaction | undefined;
  };
}

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();
  const [data, setData] = useState<GetTransactionQueryResponse["data"]>();
  const [loading, setLoading] = useState(true);
  const query = useCallback(async () => {
    setLoading(true);
    const queryStr = `query GetTransaction($hash: String!) {
      transaction(where: { hash: $hash }) {
        hash
        methodId
        sender
        nonce
        executionResult {
          status
          statusMessage
          block { batch { proof settlementTransactionHash } }
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
      const response =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (await responseData.json()) as GetTransactionQueryResponse;
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

  const getStatus = (tx: Transaction | undefined) => {
    const batch = tx?.executionResult?.block?.batch;

    if (tx == null) return "Pending";
    if (batch == null)
      return tx?.executionResult?.block != null ? "Included" : "Pending";
    if (batch.settlementTransactionHash != null) return "Settled";
    if (batch.proof != null) return "Proven";

    return "Included";
  };
  const details = [
    {
      label: "Nonce",
      value: data?.transaction?.nonce ?? "—",
    },
    {
      label: "Finality status",
      value: (
        <div className="mt-1">
          <span className="font-medium">{getStatus(data?.transaction)}</span>
        </div>
      ),
    },
    {
      label: "Execution status",
      value: (
        <div className="mt-1">
          {data?.transaction?.executionResult?.status != null ? (
            <CircleCheck className="w-4 h-4 text-green-500" />
          ) : (
            <CircleX className="w-4 h-4 text-red-500" />
          )}
        </div>
      ),
    },
    {
      label: "Status message",
      value: data?.transaction?.executionResult?.statusMessage ?? "—",
    },
    {
      label: "Method ID",
      value: data?.transaction?.methodId ?? "—",
    },
    {
      label: "Hash",
      value: data?.transaction?.hash ?? "—",
    },
    {
      label: "Sender",
      value: data?.transaction?.sender ?? "—",
    },
  ];

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Transaction{" "}
          {!loading && (
            <Truncate text={data?.transaction?.hash ?? ""} width={500} />
          )}
        </div>
      }
      details={details}
      loading={loading}
    >
      <></>
    </DetailsLayout>
  );
}
