import { Suspense } from "react";

import SettlementsPageClient from "@/components/settlements/settlementsPageClient";

export default function SettlementsPage() {
  return (
    <Suspense fallback={<div></div>}>
      <SettlementsPageClient />
    </Suspense>
  );
}
