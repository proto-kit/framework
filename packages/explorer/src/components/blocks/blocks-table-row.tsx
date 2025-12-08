import { useRouter } from "next/navigation";

import GenericTableRow from "@/components/ui/GenericTableRow";

export interface TableItem {
  height: string;
  hash: string;
  transactions: string;
  stateRoot: string;
}

export interface TableRowProps {
  key: number;
  columns: Record<string, string>;
  view: string[];
  loading: boolean;
  item: TableItem;
}

export default function BlocksTableRow({
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
      onRowClick={() => router.push(`/blocks/${item.hash}`)}
      copyKeys={["hash", "stateRoot"]}
    />
  );
}
