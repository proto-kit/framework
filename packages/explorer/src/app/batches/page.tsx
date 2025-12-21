import { Suspense } from "react";

import BatchesPageClient from "@/components/batches/BatchesPageClient";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function BatchesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BatchesPageClient />
    </Suspense>
  );
}
