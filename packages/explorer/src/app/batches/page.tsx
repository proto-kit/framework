import { Suspense } from "react";

import BatchesPageClient from "@/components/batches/BatchesPageClient";

export default function BatchesPage() {
  return (
    <Suspense fallback={<div></div>}>
      <BatchesPageClient />
    </Suspense>
  );
}
