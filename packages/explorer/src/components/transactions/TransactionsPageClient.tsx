"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import DataTable from "@/components/ui/DataTable";
import { FilterFieldDef } from "@/components/ui/FilterBuilder";
import useQueryParams from "@/hooks/use-query-params";
import configs from "@/config";
import { showPerPage } from "@/components/pagination";
import { buildWhere } from "@/lib/utils";

export interface GetTransactionsQueryResponse {
  data: {
    transactions: {
      hash: string;
      sender: string;
      methodId: string;
      nonce: string;
      executionResult: {
        status: boolean;
        statusMessage?: string;
      };
    }[];
    aggregateTransaction: {
      _count: {
        _all: number;
      };
    };
  };
}

export interface TableItem {
  hash: string;
  methodId: string;
  sender: string;
  nonce: string;
  status: string;
  statusMessage: string;
}

export const columns: Record<keyof TableItem, string> = {
  hash: "Hash",
  methodId: "Method ID",
  sender: "Sender",
  nonce: "Nonce",
  status: "Status",
  statusMessage: "Status Message",
};

const formSchema = z.object({
  methodId: z.string().optional(),
  sender: z.string().optional(),
  hash: z.string().optional(),
});

const querySchema = {
  methodId: "string",
  sender: "string",
  hash: "string",
} as const;

const fields: FilterFieldDef[] = [
  {
    name: "hash",
    label: "Hash",
    type: "string",
    placeholder: "Filter by hash",
  },
  {
    name: "methodId",
    label: "Method ID",
    type: "string",
    placeholder: "Filter by method ID",
  },
  {
    name: "sender",
    label: "Sender",
    type: "string",
    placeholder: "Filter by sender",
  },
];

const graphqlQuery = `query GetTransactions($take: Int!, $skip: Int!, $where: TransactionWhereInput) {
  transactions(take: $take, skip: $skip, where: $where) {
    methodId
    hash
    nonce
    sender
    executionResult {
      status
      statusMessage
    }
  }
  aggregateTransaction(where: $where) {
    _count { _all }
  }
}`;

export default function TransactionsPageClient() {
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
    const where = buildWhere(filters, querySchema);
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

      const result: GetTransactionsQueryResponse =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (await response.json()) as GetTransactionsQueryResponse;
      const transactions = result.data?.transactions;
      const mappedItems: TableItem[] = transactions?.map((item) => ({
        hash: item.hash,
        methodId: item.methodId,
        sender: item.sender,
        nonce: item.nonce,
        status: item.executionResult.status ? "true" : "false",
        statusMessage: item.executionResult.statusMessage ?? "—",
      }));

      setData(mappedItems);
      setTotalCount(
        result.data?.aggregateTransaction?._count?._all?.toString() || "0"
      );
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setLoading(false);
      setData([]);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  return (
    <DataTable
      title="Transactions"
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
      navigationPath="/transactions/{hash}"
      copyKeys={["hash", "sender"]}
    />
  );
}
/* eslint-enable no-underscore-dangle */
