import { Suspense } from "react";

import TransactionsPageClient from "@/components/transactions/TransactionsPageClient";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransactionsPageClient />
    </Suspense>
  );
}
