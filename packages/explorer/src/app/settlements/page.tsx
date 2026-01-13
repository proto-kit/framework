import { Suspense } from "react";

import SettlementsPageClient from "@/components/settlements/settlementsPageClient";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function SettlementsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettlementsPageClient />
    </Suspense>
  );
}
