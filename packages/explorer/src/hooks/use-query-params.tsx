import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function useQueryParams(columns: Record<string, string>) {
  const [view, setView] = useState<string[]>(Object.keys(columns));
  const searchParams = useSearchParams();

  const queryFilters = searchParams.get("filters");
  const initalFilters = queryFilters
    ? new URLSearchParams(queryFilters)
    : undefined;
  const filtersObject: Record<string, undefined | string> = {};

  initalFilters?.forEach((value, key) => {
    filtersObject[key] = value;
  });

  console.log("initialFilters", {
    initalFilters,
    filtersObject,
  });

  const [filters, setFilters] =
    useState<Record<string, string | undefined>>(filtersObject);

  const router = useRouter();

  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  useEffect(() => {
    setPage(Number(searchParams.get("page")) || 1);
  }, [searchParams.get("page")]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (page !== 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }

    // dont pass the default view to query params
    if (view.join(",") !== Object.keys(columns).join(",")) {
      params.set("view", view.join(","));
    } else {
      params.delete("view");
    }

    for (const [key, value] of Object.entries(filters)) {
      if (!value) {
        delete filters[key];
      }
    }

    if (Object.keys(filters).length) {
      const serializedFilters = new URLSearchParams(
        filters as Record<string, string>
      );
      params.set("filters", serializedFilters.toString());
    } else {
      params.delete("filters");
    }

    router.push(
      `${window.location.origin}${window.location.pathname}?${params.toString()}`
    );
  }, [view, filters, page]);

  return [page, view, filters, setPage, setView, setFilters] as const;
}
