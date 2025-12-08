"use client";

import { useRouter } from "next/navigation";

import GenericTableRow from "@/components/ui/GenericTableRow";

export interface TableItem {
  hash: string;
  methodId: string;
  sender: string;
  status: string;
  nonce: string;
  statusMessage: string;
}

export interface TableRowProps {
  key: number;
  columns: Record<string, string>;
  view: string[];
  loading: boolean;
  item: TableItem;
}
export default function TransactionsTableRow({
  columns,
  view,
  loading,
  item,
}: TableRowProps) {
  const router = useRouter();
  return (
    <GenericTableRow
      columns={columns}
      view={view}
      loading={loading}
      item={item}
      onRowClick={() => router.push(`/transactions/${item.hash}`)}
      copyKeys={["hash", "methodId", "sender"]}
      statusKey={"status"}
    />
  );
}
