"use client";
import Search from "@/components/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useQuery from "@/hooks/use-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

interface SearchQueryResponse {
  blocks: {
    totalCount: string;
  };
  transactions: {
    totalCount: string;
  };
}

const formSchema = z.object({
  hash: z.string(),
});

export default function Home() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hash: undefined,
    },
  });

  const hash = form.watch("hash");

  const query = `
    {
      blocks(take: 1, skip: 0, hash: "${hash}"){
        totalCount
      }
      transactions(take: 1, skip: 0, hash: "${hash}"){
        totalCount
      }
    }
  `;

  const [data, loading, fetchQuery] = useQuery<SearchQueryResponse>(
    query,
    false
  );

  useEffect(() => {
    if (data?.blocks.totalCount) {
      router.push(`/blocks/${hash}`);
    } else if (data?.transactions.totalCount) {
      router.push(`/transactions/${hash}`);
    }
  }, [data]);

  return (
    <div className="flex flex-col flex-grow w-full gap-8 justify-center items-center ">
      <div className="flex items-center  justify-center flex-col gap-2 relative -mt-48">
        <h1 className="text-5xl font-extrabold">Protokit explorer</h1>
        <Badge variant={"secondary"} className="absolute -top-8">
          Developer preview
        </Badge>
        <p className="">
          Explore blocks, transactions, status messages and more.
        </p>
      </div>
      <div className="w-[520px] mx-auto flex items-center gap-4">
        <FormProvider {...form}>
          <form
            id="search"
            onSubmit={form.handleSubmit((data) => {
              fetchQuery();
            })}
          >
            <Search
              loading={loading}
              error={
                data?.blocks.totalCount === 0 &&
                data?.transactions.totalCount === 0
              }
            />
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
