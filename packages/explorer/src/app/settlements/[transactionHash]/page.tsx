"use client";

/* eslint-disable no-underscore-dangle */

import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";

import { DetailsLayout } from "@/components/details/layout";
import BatchesTableRow, {
  TableItem,
} from "@/components/batches/batches-table-row";
import { Form } from "@/components/ui/form";
import List from "@/components/list";
import config from "@/config";
import { typed } from "@/lib/utils";

export interface GetSettlementQueryResponse {
  data: {
    settlement:
      | {
          batches: {
            height: string;
            settlementTransactionHash: string;
            _count: {
              blocks: number;
            };
          }[];
          transactionHash: string;
          promisedMessagesHash: string;
        }
      | undefined;
  };
}

const columns: Record<keyof TableItem, string> = {
  height: "Height",
  blocks: "Blocks",
  settlementTransactionHash: "Settlement Transaction Hash",
};

export default function SettlementDetail() {
  const params = useParams<{ transactionHash: string }>();
  const [data, setData] = useState<GetSettlementQueryResponse["data"]>();
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
              settlement (where: {transactionHash: "${params.transactionHash}"}) {
                batches {
                    height
                    settlementTransactionHash
                    _count {
                        blocks
                    }
                }
                transactionHash
                promisedMessagesHash
              }
        }`,
      }),
    });
    try {
      const response = typed<GetSettlementQueryResponse>(
        await responseData.json()
      );
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
      label: "Transaction Hash",
      value: data?.settlement?.transactionHash ?? "—",
    },
    {
      label: "Promised Messages Hash",
      value: data?.settlement?.promisedMessagesHash ?? "—",
    },
    {
      label: "Batches",
      value: `${data?.settlement?.batches?.length ?? "—"}`,
    },
  ];

  const form = useForm();

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Settlement {!loading && <>#{data?.settlement?.transactionHash}</>}
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
              <BatchesTableRow
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
                data?.settlement?.batches?.map((item) => ({
                  height: item.height,
                  settlementTransactionHash: item.settlementTransactionHash,
                  blocks: item._count?.blocks?.toString(),
                })) ?? [],
            }}
            columns={columns}
            title={"Batches"}
            titleClassName="text-4xl lg:text-4xl"
            hasDetails={true}
            pagination={false}
          />
        </form>
      </Form>
    </DetailsLayout>
  );
}
/* eslint-enable no-underscore-dangle */
