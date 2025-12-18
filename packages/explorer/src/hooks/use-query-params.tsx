"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { typed } from "@/lib/utils";

function isValidFilter(
  key: string,
  value: string | undefined,
  allowed: Record<string, "string" | "number" | "boolean">
): boolean {
  if (value == null || value === "") return false;
  if (!(key in allowed)) return false;
  const expected = allowed[key];
  switch (expected) {
    case "number":
      return !Number.isNaN(Number(value));

    case "boolean":
      return ["true"].includes(value.toString());

    case "string":
      return typeof value === "string";

    default:
      return false;
  }
}

export default function useQueryParams(
  columns: Record<string, string>,
  allowedFilters: Record<string, "string" | "number" | "boolean">
) {
  const [view, setView] = useState<string[]>(Object.keys(columns));
  const searchParams = useSearchParams();

  const queryFilters = searchParams.get("filters");

  const initialFilters =
    queryFilters === null ? undefined : new URLSearchParams(queryFilters);
  const filtersObject: Record<string, undefined | string> = {};

  initialFilters?.forEach((value, key) => {
    filtersObject[key] = value;
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
      if (!isValidFilter(key, value, allowedFilters)) {
        delete filters[key];
      }
    }
    if (Object.keys(filters).length) {
      const serializedFilters = new URLSearchParams(
        typed<Record<string, string>>(filters)
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
