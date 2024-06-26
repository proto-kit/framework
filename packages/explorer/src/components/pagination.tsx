import {
  Pagination as PaginationWrapper,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { showPerPage } from "./list";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalCount?: number;
}

export default function Pagination({ page, totalCount }: PaginationProps) {
  const router = useRouter();
  const previousPage = page - 1;
  const nextPage = page + 1;

  const hasPreviousPage = page > 1;
  const hasNextPage =
    ((totalCount ?? 0) - page * showPerPage) / showPerPage > 1;

  const navigate = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    router.push(
      `${window.location.origin}${window.location.pathname}?${params.toString()}`
    );
  };

  return (
    <PaginationWrapper className="flex justify-end flex-row w-full">
      <PaginationContent>
        <PaginationItem disabled={!hasPreviousPage}>
          <PaginationPrevious
            className={cn({
              "cursor-pointer": hasPreviousPage,
            })}
            onClick={() => navigate(previousPage)}
          />
        </PaginationItem>
        {hasPreviousPage && (
          <PaginationItem>
            <PaginationLink
              className="cursor-pointer"
              onClick={() => navigate(previousPage)}
            >
              {previousPage}
            </PaginationLink>
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationLink
            className="cursor-pointer"
            isActive={true}
            onClick={() => navigate(page)}
          >
            {page}
          </PaginationLink>
        </PaginationItem>

        {hasNextPage && (
          <PaginationItem>
            <PaginationLink
              className="cursor-pointer"
              onClick={() => navigate(nextPage)}
            >
              {nextPage}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem disabled={!hasNextPage}>
          <PaginationNext
            className="cursor-pointer"
            onClick={() => navigate(nextPage)}
          />
        </PaginationItem>
      </PaginationContent>
    </PaginationWrapper>
  );
}
