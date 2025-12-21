import { Suspense } from "react";

import BlocksPageClient from "@/components/blocks/BlocksPageClient";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function BlocksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BlocksPageClient />
    </Suspense>
  );
}
