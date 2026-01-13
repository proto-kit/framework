"use client";

/* eslint-disable no-underscore-dangle */
/* eslint-disable no-nested-ternary */

import { useCallback, useEffect, useState } from "react";
import { Blocks, Zap, Link, Clock, Database } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import config from "@/config";
import { cn } from "@/lib/utils";
import CopyToClipboard from "@/components/ui/copy-to-clipboard";

export interface GetDashboardStatsResponse {
  data: {
    aggregateBlock: {
      _count: {
        _all: number;
      };
    };
    aggregateTransaction: {
      _count: {
        _all: number;
      };
    };
    blocks: Array<{
      height: number;
      hash: string;
      fromStateRoot: string;
      result: {
        stateRoot: string;
      };
    }>;
    settlements: Array<{
      transactionHash: string;
      promisedMessagesHash: string;
    }>;
  };
}

interface DashboardStatsData {
  blocksCount: number;
  transactionsCount: number;
  latestBlock: {
    height: number;
    hash: string;
  } | null;
  latestSettlement: {
    hash: string;
    promisedMessagesHash: string;
  } | null;
  currentStateRoot: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  description?: string;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function StatCard({
  icon,
  label,
  value,
  description,
  loading = false,
  className,
  children,
}: StatCardProps) {
  return (
    <Card className={cn("flex-1 min-w-[250px]", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : children != null ? (
          <>{children}</>
        ) : (
          <>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
              {value}
            </div>
            {description != null && (
              <CardDescription className="text-xs mt-1">
                {description}
              </CardDescription>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const query = `query GetDashboardStats {
        aggregateBlock { _count { _all } }
        aggregateTransaction { _count { _all } }
        blocks(take: 1, orderBy: { height: desc }) {
          height
          hash
          fromStateRoot
          result { stateRoot }
        }
        settlements(take: 1, orderBy: { transactionHash: desc }) {
          transactionHash
          promisedMessagesHash
        }
      }`;

      const response = await fetch(`${config.INDEXER_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result: GetDashboardStatsResponse =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        (await response.json()) as GetDashboardStatsResponse;
      const { data } = result;

      setStats({
        blocksCount: data?.aggregateBlock?._count?._all || 0,
        transactionsCount: data?.aggregateTransaction?._count?._all || 0,
        latestBlock:
          data?.blocks?.[0] != null
            ? {
                height: data.blocks[0].height,
                hash: data.blocks[0].hash,
              }
            : null,
        latestSettlement:
          data?.settlements?.[0] != null
            ? {
                hash: data.settlements[0].transactionHash,
                promisedMessagesHash: data.settlements[0].promisedMessagesHash,
              }
            : null,
        currentStateRoot:
          data?.blocks?.[0]?.result?.stateRoot ||
          data?.blocks?.[0]?.fromStateRoot ||
          "—",
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Blocks className="w-5 h-5" />}
          label="Total Blocks"
          value={stats?.blocksCount ?? 0}
          loading={loading}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Total Transactions"
          value={stats?.transactionsCount ?? 0}
          loading={loading}
        />
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Current State Root"
          value={stats?.currentStateRoot ?? "-"}
          loading={loading}
        >
          <div className="text-md px-2 py-1 rounded block break-all">
            <CopyToClipboard text={stats?.currentStateRoot} />
          </div>
        </StatCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Latest Block"
          loading={loading}
        >
          {stats?.latestBlock ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Height</p>
                <p className="text-2xl font-bold">
                  #{stats.latestBlock.height}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Hash</p>
                <div className="text-md px-2 py-1 rounded block break-all">
                  <CopyToClipboard text={stats.latestBlock.hash} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </StatCard>
        <StatCard
          icon={<Link className="w-5 h-5" />}
          label="Latest Settlement"
          loading={loading}
        >
          {stats?.latestSettlement ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Transaction Hash
                </p>
                <div className="text-md px-2 py-1 rounded block break-all">
                  <CopyToClipboard text={stats.latestSettlement.hash} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Promised Messages Hash
                </p>
                <div className="text-md px-2 py-1 rounded block break-all">
                  <CopyToClipboard
                    text={stats.latestSettlement.promisedMessagesHash}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </StatCard>
      </div>
    </div>
  );
}
/* eslint-enable no-underscore-dangle */
/* eslint-enable no-nested-ternary */
