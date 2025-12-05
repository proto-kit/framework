import { Suspense } from "react";

import TransactionsPageClient from "@/components/transactions/TransactionsPageClient";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <TransactionsPageClient />
    </Suspense>
  );
}
