"use client";
import { Card } from "@/components/ui/card";
import { CircleCheck, CircleX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DetailsLayout } from "@/components/details/layout";
import TransactionsTableRow, {
  TableItem,
} from "@/components/transactions/transactions-table-row";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import List, { ListProps } from "@/components/list";
import { useCallback, useEffect, useState } from "react";
import config from "@/config";
import Truncate from "react-truncate-inside/es";
import useQuery from "@/hooks/use-query";
import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { cn } from "@/lib/utils";

export interface GetTransactionQueryResponse {
  transactions: {
    totalCount: string;
    items: (
      | {
          tx: {
            hash: string;
            sender: string;
            methodId: string;
            nonce: string;
          };
          status: boolean;
          statusMessage?: string;
          stateTransitions: {
            path: string;
            from: {
              isSome: boolean;
              value: string;
            };
            to: {
              isSome: boolean;
              value: string;
            };
          }[];
          protocolTransitions: {
            path: string;
            from: {
              isSome: boolean;
              value: string;
            };
            to: {
              isSome: boolean;
              value: string;
            };
          }[];
        }
      | undefined
    )[];
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

export default function BlockDetail() {
  const params = useParams<{ hash: string }>();

  const [data, loading] = useQuery<GetTransactionQueryResponse>(`{
      transactions(take: 1, skip: 0, hash: "${params.hash}"){
        totalCount,
        items {
          tx {
            hash,
            methodId,
            sender,
            nonce
          },
          status,
          statusMessage,
          stateTransitions {
            path,
            from {
              isSome, 
              value
            }
            to {
              isSome,
              value
            }
          }
          protocolTransitions {
            path,
            from {
              isSome, 
              value
            }
            to {
              isSome,
              value
            }
          }
        }
      }
    }`);

  const details = [
    {
      label: "Nonce",
      value: data?.transactions.items[0]?.tx.nonce ?? "—",
    },
    {
      label: "Status",
      value: (
        <div className="mt-1">
          {data?.transactions.items[0]?.status ? (
            <CircleCheck className="w-4 h-4 text-green-500" />
          ) : (
            <CircleX className="w-4 h-4 text-red-500" />
          )}
        </div>
      ),
    },
    {
      label: "Status message",
      value: data?.transactions.items[0]?.statusMessage ?? "—",
    },
    {
      label: "Method ID",
      value: data?.transactions.items[0]?.tx.methodId ?? "—",
    },
    {
      label: "Hash",
      value: data?.transactions.items[0]?.tx.hash ?? "—",
    },
    {
      label: "Sender",
      value: data?.transactions.items[0]?.tx.sender ?? "—",
    },
  ];

  const form = useForm();

  return (
    <DetailsLayout
      title={
        <div className="flex gap-4">
          Transaction{" "}
          {!loading && (
            <Truncate
              text={data?.transactions.items[0]?.tx.hash ?? ""}
              width={500}
            />
          )}
        </div>
      }
      details={details}
      loading={loading}
    >
      {loading ? (
        <></>
      ) : (
        <div className="flex flex-col w-full flex-grow">
          <div>
            <h1 className={cn("text-3xl font-extrabold tracking-tight mb-4")}>
              Runtime state transitions (
              {data?.transactions.items[0]?.stateTransitions.length})
            </h1>
            <Card>
              {data?.transactions.items[0]?.stateTransitions && (
                <JsonView
                  data={data?.transactions.items[0]?.stateTransitions}
                  shouldExpandNode={allExpanded}
                  style={{
                    ...defaultStyles,
                    container: "",
                    booleanValue: "",
                  }}
                />
              )}
            </Card>
          </div>
          <div>
            <h1
              className={cn("text-3xl font-extrabold tracking-tight mt-4 mb-4")}
            >
              Protocol state transitions (
              {data?.transactions.items[0]?.protocolTransitions.length})
            </h1>
            <Card>
              {data?.transactions.items[0]?.protocolTransitions && (
                <JsonView
                  data={data?.transactions.items[0]?.protocolTransitions}
                  shouldExpandNode={allExpanded}
                  style={{
                    ...defaultStyles,
                    container: "",
                    booleanValue: "",
                  }}
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </DetailsLayout>
  );
}
