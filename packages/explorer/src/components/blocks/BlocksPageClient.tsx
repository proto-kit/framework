"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import DataTable from "@/components/ui/DataTable";
import { FilterFieldDef } from "@/components/ui/FilterBuilder";
import useQueryParams from "@/hooks/use-query-params";
import configs from "@/config";
import { showPerPage } from "@/components/pagination";

export interface TableItem {
  height: string;
  hash: string;
  transactions: string;
  stateRoot: string;
}

export interface GetBlocksQueryResponse {
  data: {
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
    aggregateBlock: {
      _count: {
        _all: number;
      };
    };
  };
}

export const columns: Record<keyof TableItem, string> = {
  height: "Height",
  hash: "Hash",
  transactions: "Transactions",
  stateRoot: "State Root",
};

const formSchema = z.object({
  height: z.string().optional(),
  hash: z.string().optional(),
  hideEmpty: z.boolean().optional(),
});

const querySchema = {
  height: "number",
  hash: "string",
  hideEmpty: "boolean",
} as const;

const fields: FilterFieldDef[] = [
  {
    name: "height",
    label: "Height",
    type: "number",
    placeholder: "Filter by height",
  },
  {
    name: "hash",
    label: "Hash",
    type: "string",
    placeholder: "Filter by hash",
  },
  {
    name: "hideEmpty",
    label: "Hide empty blocks",
    type: "boolean",
    placeholder: "Hide empty blocks",
    initialValue: false,
  },
];

const graphqlQuery = `query GetBlocks($take: Int!, $skip: Int!, $where: BlockWhereInput) {
  blocks(take: $take, skip: $skip, orderBy: {height: desc}, where: $where) {
    height
    hash
    result { stateRoot }
    _count { transactions }
  }
  aggregateBlock(where: $where) { _count { _all } }
}`;

const queryTransformer = (
  filters: Record<string, unknown>,
  schema: Record<string, "string" | "boolean" | "number">
) => {
  const where: Record<string, unknown> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && value !== "") {
      if (key === "hideEmpty") {
        where.OR =
          value === "true"
            ? [
                { transactionsHash: { not: { equals: "0" } } },
                {
                  transactions: {
                    some: { tx: { is: { isMessage: { equals: true } } } },
                  },
                },
              ]
            : undefined;
      } else {
        const fieldType = schema[key];
        where[key] = {
          equals: fieldType === "number" ? Number(value) : value,
        };
      }
    }
  });

  return where;
};

export default function BlocksPageClient() {
  const [page, view, filters, setPage, setView, setFilters] = useQueryParams(
    columns,
    querySchema
  );
  const [data, setData] = useState<TableItem[]>([]);
  const [totalCount, setTotalCount] = useState("0");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const skip = showPerPage * (page - 1);
    const where = queryTransformer(filters, querySchema);
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

      const result: GetBlocksQueryResponse =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (await response.json()) as GetBlocksQueryResponse;
      const blocks = result.data?.blocks;
      const mappedItems: TableItem[] = blocks?.map((item) => ({
        height: item.height,
        hash: item.hash,
        transactions: item._count?.transactions?.toString(),
        stateRoot: item.result.stateRoot,
      }));

      setData(mappedItems);
      setTotalCount(
        result.data?.aggregateBlock?._count?._all?.toString() || "0"
      );
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch blocks:", error);
      setLoading(false);
      setData([]);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <DataTable
      title="Blocks"
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
      navigationPath="/blocks/{hash}"
      copyKeys={["hash", "stateRoot"]}
    />
  );
}
/* eslint-enable no-underscore-dangle */
