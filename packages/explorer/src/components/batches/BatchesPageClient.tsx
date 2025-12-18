"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import useQueryParams from "@/hooks/use-query-params";
import DataTable from "@/components/ui/DataTable";
import { FilterFieldDef } from "@/components/ui/FilterBuilder";
import configs from "@/config";
import { showPerPage } from "@/components/pagination";
import { buildWhere } from "@/lib/utils";

export interface TableItem {
  height: string;
  blocks: string;
  settlementTransactionHash: string;
}

export interface GetBatchesQueryResponse {
  data: {
    batches: {
      height: string;
      settlementTransactionHash: string;
      _count: {
        blocks: number;
      };
    }[];
    aggregateBatch: {
      _count: {
        _all: number;
      };
    };
  };
}

export const columns: Record<keyof TableItem, string> = {
  height: "Height",
  blocks: "Blocks",
  settlementTransactionHash: "Settlement Transaction Hash",
};

const formSchema = z.object({
  height: z.string().optional(),
  settlementTransactionHash: z.string().optional(),
});

const querySchema = {
  height: "number",
  settlementTransactionHash: "string",
} as const;

const fields: FilterFieldDef[] = [
  {
    name: "height",
    label: "Height",
    type: "number",
    placeholder: "Filter by height",
  },
  {
    name: "settlementTransactionHash",
    label: "Settlement transaction hash",
    type: "string",
    placeholder: "Filter by settlement tx hash",
  },
];

const graphqlQuery = `query GetBatches($take: Int!, $skip: Int!, $where: BatchWhereInput) {
  batches(take: $take, skip: $skip, orderBy: {height: desc}, where: $where) {
    settlementTransactionHash
    height
    _count { blocks }
  }
  aggregateBatch(where: $where) { _count { _all } }
}`;

export default function BatchesPageClient() {
  const [page, view, filters, setPage, setView, setFilters] = useQueryParams(
    columns,
    querySchema
  );

  const [data, setData] = useState<TableItem[]>([]);
  const [totalCount, setTotalCount] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const skip = showPerPage * (Math.max(1, page) - 1);
    const where = buildWhere<string | number>(filters, querySchema);
    const variables = {
      take: showPerPage,
      skip,
      where: Object.keys(where).length ? where : undefined,
    };

    try {
      const response = await fetch(`${configs.INDEXER_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: graphqlQuery, variables }),
      });

      const result: GetBatchesQueryResponse =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (await response.json()) as GetBatchesQueryResponse;
      const batches = result.data?.batches;
      const mappedItems: TableItem[] = batches?.map((item) => ({
        height: item.height,
        settlementTransactionHash: item.settlementTransactionHash,
        blocks: item._count?.blocks?.toString() || "0",
      }));

      setData(mappedItems);
      setTotalCount(
        result.data?.aggregateBatch?._count?._all?.toString() || "0"
      );
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setLoading(false);
      setData([]);
      setTotalCount("0");
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <DataTable
      title="Batches"
      columns={columns}
      items={data}
      totalCount={totalCount}
      loading={loading}
      filterFields={fields}
      formSchema={formSchema}
      filters={filters}
      page={page}
      view={view}
      onFiltersChange={setFilters}
      onPageChange={setPage}
      onViewChange={setView}
      navigationPath="/batches/{height}"
      copyKeys={["settlementTransactionHash"]}
    />
  );
}
/* eslint-enable no-underscore-dangle */
