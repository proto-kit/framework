"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Truncate from "react-truncate-inside/es";

import { DetailsLayout } from "@/components/details/layout";
import config from "@/config";

export interface GetTransactionQueryResponse {
  data: {
    transaction:
      | {
          hash: string;
          sender: string;
          methodId: string;
          nonce: string;
          executionResult: {
            status: boolean;
            statusMessage?: string;
          };
          status: boolean;
          statusMessage?: string;
        }
      | undefined;
  };
}

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();
  const [data, setData] = useState<GetTransactionQueryResponse["data"]>();
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
          transaction(where: { hash: "${params.hash}"}) {
                hash
                methodId
                sender
                nonce
                executionResult {
                  status
                  statusMessage
                }
            }
        }`,
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

  const details = [
    {
      label: "Nonce",
      value: data?.transaction?.nonce ?? "—",
    },
    {
      label: "Status",
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
