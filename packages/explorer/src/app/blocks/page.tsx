import { Suspense } from "react";

import BlocksPageClient from "@/components/blocks/BlocksPageClient";

export default function BlocksPage() {
  return (
    <Suspense fallback={<div></div>}>
      <BlocksPageClient />
    </Suspense>
  );
}
