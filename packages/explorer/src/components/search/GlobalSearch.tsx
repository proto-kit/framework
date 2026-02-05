"use client";

/* eslint-disable no-underscore-dangle */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Zap, Cuboid, Link } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import config from "@/config";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "block" | "transaction" | "settlement";
  hash: string;
  label: string;
}

export interface SearchResponse {
  data: {
    blocks: Array<{
      hash: string;
      height: number;
    }>;
    transactions: Array<{
      hash: string;
      methodId: string;
    }>;
    settlements: Array<{
      transactionHash: string;
      promisedMessagesHash: string;
    }>;
  };
}
export interface GetBlocksMaxHeightResponse {
  data: {
    aggregateBlock: {
      _max: {
        height: number | null;
      };
    };
  };
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMaxHeight = async () => {
      try {
        const gqlQuery = `query {
                            aggregateBlock {
                              _max {
                                height
                              }
                            }
                          }`;
        const res = await fetch(`${config.INDEXER_URL}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: gqlQuery }),
        });
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const resJson = (await res.json()) as GetBlocksMaxHeightResponse;
        setMaxHeight(resJson?.data?.aggregateBlock?._max?.height ?? null);
      } catch (error) {
        console.error("Failed to fetch max height:", error);
      }
    };
    void fetchMaxHeight();
  }, []);

  const searchIndexer = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery) {
        setResults([]);
        return;
      }

      setLoading(true);
      const foundResults: SearchResult[] = [];

      try {
        const isNumeric = /^\d+$/.test(searchQuery);
        const searchHeight = isNumeric ? parseInt(searchQuery, 10) : null;
        const shouldSearchByHeight =
          searchHeight !== null &&
          maxHeight !== null &&
          searchHeight <= maxHeight;
        const searchByHeightQuery = `
          blocks(
            where: { height: { equals: $height } }
            take: 10
          ) {
            hash
            height
          }
          `;
        const searchByHashQuery = `
          blocks(
            where: { hash: { contains: $input } }
            take: 10
          ) {
            hash
            height
          }
          `;
        const gqlQuery = `
        query Search($input: String! ${shouldSearchByHeight ? ", $height: Int" : ""}) {
          ${shouldSearchByHeight ? searchByHeightQuery : searchByHashQuery}          
          transactions(
            where: { hash: { contains: $input } }
            take: 10
          ) {
            hash
            methodId
          }

          settlements(
            where: { transactionHash: { contains: $input } }
            take: 10
          ) {
            transactionHash
            promisedMessagesHash
          }
        }
      `;
        const queryRes = await fetch(`${config.INDEXER_URL}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: gqlQuery,
            variables: {
              input: searchQuery,
              height: shouldSearchByHeight ? searchHeight : undefined,
            },
          }),
        });
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const res = (await queryRes.json()) as SearchResponse;
        res?.data?.blocks.forEach((block) => {
          foundResults.push({
            type: "block",
            hash: block.hash,
            label: `Block #${block.height}`,
          });
        });

        res?.data?.transactions?.forEach((tx) => {
          foundResults.push({
            type: "transaction",
            hash: tx.hash,
            label: `Transaction ${tx.hash.substring(0, 8)}...`,
          });
        });

        res?.data?.settlements?.forEach((settlement) => {
          foundResults.push({
            type: "settlement",
            hash: settlement.transactionHash,
            label: `Settlement ${settlement.transactionHash.substring(0, 8)}...`,
          });
        });

        setResults(foundResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    },
    [maxHeight]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchIndexer(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchIndexer, maxHeight]);

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "block":
        router.push(`/blocks/${result.hash}`);
        break;
      case "transaction":
        router.push(`/transactions/${result.hash}`);
        break;
      case "settlement":
        router.push(`/settlements/${result.hash}`);
        break;
      default:
        return;
    }
    setQuery("");
    setShowResults(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "block":
        return <Cuboid className="w-4 h-4" />;
      case "transaction":
        return <Zap className="w-4 h-4" />;
      case "settlement":
        return <Link className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search blocks, transactions, settlements..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          className="pl-10 pr-4 py-2 h-11"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full shadow-lg z-50">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleResultClick(result)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left",
                  idx !== results.length - 1 && "border-b"
                )}
              >
                <div className="text-muted-foreground">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {result.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {result.hash}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {showResults && query && results.length === 0 && !loading && (
        <Card className="absolute top-full mt-2 w-full shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          No results found
        </Card>
      )}
    </div>
  );
}
/* eslint-enable no-underscore-dangle */
