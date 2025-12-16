"use client";

/* eslint-disable no-underscore-dangle */

import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";

import { DetailsLayout } from "@/components/details/layout";
import BlocksTableRow, {
  TableItem,
} from "@/components/blocks/blocks-table-row";
import { Form } from "@/components/ui/form";
import List from "@/components/list";
import config from "@/config";
import { typed } from "@/lib/utils";

export interface GetBatchQueryResponse {
  data: {
    batch:
      | {
          blocks: {
            height: string;
            hash: string;
            result: {
              stateRoot: string;
            };
            _count: {
              transactions: number;
            };
          }[];
          settlementTransactionHash: string;
          height: string;
        }
      | undefined;
  };
}

const columns: Record<keyof TableItem, string> = {
  height: "Height",
  hash: "Hash",
  transactions: "Transactions",
  stateRoot: "State Root",
};

export default function BatchDetail() {
  const params = useParams<{ height: string }>();
  const [data, setData] = useState<GetBatchQueryResponse["data"]>();
  const [loading, setLoading] = useState(true);
  const query = useCallback(async () => {
    setLoading(true);

    const queryStr = `query GetBatch($height: Int!) {
      batch(where: { height: $height }) {
        height
        settlementTransactionHash
        blocks {
          height
          hash
          result { stateRoot }
          _count { transactions }
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
        variables: { height: Number(params.height) },
      }),
    });
    try {
      const response = typed<GetBatchQueryResponse>(await responseData.json());
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
      value: data?.batch?.height ?? "—",
    },
    {
      label: "Settlement Transaction Hash",
      value: data?.batch?.settlementTransactionHash ?? "—",
    },
    {
      label: "Blocks",
      value: `${data?.batch?.blocks?.length ?? "—"}`,
    },
  ];

  const form = useForm();

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Batch {!loading && <>#{data?.batch?.height}</>}
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
              <BlocksTableRow
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
                data?.batch?.blocks?.map((item) => ({
                  height: item.height,
                  hash: item.hash,
                  transactions: item._count?.transactions?.toString(),
                  stateRoot: item.result?.stateRoot,
                })) ?? [],
            }}
            columns={columns}
            title={"Blocks"}
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
