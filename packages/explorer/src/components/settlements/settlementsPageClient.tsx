"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import SettlementsFilters from "@/components/settlements/settlements-filters";
import useQueryParams from "@/hooks/use-query-params";
import SettlementsTableRow, {
  TableItem,
} from "@/components/settlements/settlements-table-row";
import { Form } from "@/components/ui/form";
import List, { ListProps } from "@/components/list";
import config from "@/config";
import { showPerPage } from "@/components/pagination";
import { typed } from "@/lib/utils";

export interface GetSettlementsQueryResponse {
  data: {
    settlements: {
      transactionHash: string;
      promisedMessagesHash: string;
      _count: {
        batches: number;
      };
    }[];
    aggregateSettlement: {
      _count: {
        _all: number;
      };
    };
  };
}

const columns: Record<keyof TableItem, string> = {
  transactionHash: "Transaction Hash",
  promisedMessagesHash: "Promised Messages Hash",
  batches: "Batches",
};

const formSchema = z.object({
  transactionHash: z.string().optional(),
  promisedMessagesHash: z.string().optional(),
});

export default function SettlementsPageClient() {
  const querySchema = {
    transactionHash: "string",
    promisedMessagesHash: "string",
  } as const;

  const [page, view, filters, setPage, setView, setFilters] = useQueryParams(
    columns,
    querySchema
  );
  const [data, setData] = useState<ListProps<TableItem>["data"]>();
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionHash:
        filters?.transactionHash != null && filters?.transactionHash !== ""
          ? filters?.transactionHash
          : undefined,
      promisedMessagesHash:
        filters?.promisedMessagesHash != null &&
        filters?.promisedMessagesHash !== ""
          ? filters?.promisedMessagesHash
          : undefined,
    },
  });

  const handleSubmit = useCallback(
    (formData: z.infer<typeof formSchema>) => {
      setFilters(formData);
      setPage(1);
    },
    [setFilters, setPage]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    form.setValue("transactionHash", "");
    form.setValue("promisedMessagesHash", "");
    void form.trigger();
  }, [setFilters, form]);

  const query = useCallback(async () => {
    setLoading(true);

    const skip = showPerPage * (page - 1);

    const where = Object.entries(filters || {}).reduce<Record<string, object>>(
      (filter, [key, value]) => {
        if (value != null && value !== "") {
          const fieldType = querySchema[typed<keyof typeof querySchema>(key)];
          filter[key] = {
            equals: fieldType === "string" ? String(value) : value,
          };
        }
        return filter;
      },
      {}
    );

    const variables = {
      take: showPerPage,
      skip,
      where: Object.keys(where).length ? where : undefined,
    };

    const queryStr = `query GetSettlements($take: Int!, $skip: Int!, $where: SettlementWhereInput) {
      settlements(take: $take, skip: $skip, where: $where) {
        transactionHash
        promisedMessagesHash
        _count { batches }
      }
      aggregateSettlement(where: $where) { _count { _all } }
    }`;

    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: queryStr, variables }),
    });
    try {
      const response =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (await responseData.json()) as GetSettlementsQueryResponse;
      setData({
        totalCount: response.data?.aggregateSettlement?._count?._all.toString(),
        items: response?.data?.settlements?.map((item) => ({
          transactionHash: item.transactionHash,
          promisedMessagesHash: item.promisedMessagesHash,
          batches: item._count?.batches?.toString(),
        })),
      });
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(undefined);
    }
  }, [filters, page]);

  useEffect(() => {
    void query();
  }, [filters, page]);

  return (
    <>
      <Form {...form}>
        <form id="table" onSubmit={form.handleSubmit(handleSubmit)}>
          <List
            view={view}
            onViewChange={setView}
            filters={<SettlementsFilters clearFilters={clearFilters} />}
            loading={loading}
            tableRow={(item, i, isLoading, currentView) => (
              <SettlementsTableRow
                columns={columns}
                key={i}
                item={item}
                loading={isLoading}
                view={currentView}
              />
            )}
            page={page}
            data={data}
            columns={columns}
            title={"Settlements"}
            hasDetails={true}
          />
        </form>
      </Form>
    </>
  );
}
/* eslint-enable no-underscore-dangle */
