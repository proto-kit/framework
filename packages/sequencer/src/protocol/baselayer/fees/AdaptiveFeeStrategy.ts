import { noop } from "@proto-kit/common";
import { Client, fetchExchange, gql } from "@urql/core";
import { inject } from "tsyringe";

import { TtlCache } from "../../../helpers/TTLCache";
import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";
import { MinaBaseLayer } from "../MinaBaseLayer";

import { FeeStrategy } from "./FeeStrategy";

/**
 * Adaptive fee strategy configuration.
 * - If mempool is at/above `mempoolLargeSize`,
 *   use the `mempoolNthHighest` highest fee from the mempool.
 * - When mempool is small, use the `lastBlockNthLowest` lowest fee from the recent block.
 * - Clamp the fee between `minFee` and `maxFee`.
 * - Use `fallbackFee` if no fees are available.
 */
export type AdaptiveFeeStrategyConfig = {
  mempoolLargeSize?: number;
  mempoolNthHighest?: number;
  lastBlockNthLowest?: number;
  minFee?: number;
  maxFee?: number;
  fallbackFee?: number;
};

const MEMPOOL_CACHE_TIMEOUT_MS = 30 * 1000; // 30 seconds
const BLOCK_CACHE_TIMEOUT_MS = 3 * 60_000; // 3 minutes

const DEFAULT_MEMPOOL_LARGE_SIZE = 10;
const DEFAULT_MEMPOOL_NTH_HIGHEST = 10;
const DEFAULT_LAST_BLOCK_NTH_LOWEST = 1;
const DEFAULT_FALLBACK_FEE = 0.1 * 1e9;

type BlockFeesQueryResult = {
  bestChain?: Array<{
    transactions?: {
      zkappCommands?: Array<{
        zkappCommand?: {
          feePayer?: {
            body?: {
              fee?: string | number;
            };
          };
        };
      }>;
    };
  }>;
};

type MempoolFeesQueryResult = {
  pooledZkappCommands?: Array<{
    zkappCommand?: {
      feePayer?: {
        body?: {
          fee?: string | number;
        };
      };
    };
  }>;
};

const MempoolFeesQuery = gql`
  query MempoolFeesQuery {
    pooledZkappCommands {
      zkappCommand {
        feePayer {
          body {
            fee
          }
        }
      }
    }
  }
`;

const LastBlockFeesQuery = gql`
  query LastBlockFeesQuery {
    bestChain(maxLength: 1) {
      transactions {
        zkappCommands {
          zkappCommand {
            feePayer {
              body {
                fee
              }
            }
          }
        }
      }
    }
  }
`;

function clamp(fee: number, min?: number, max?: number): number {
  let result = fee;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}

@sequencerModule()
export class AdaptiveFeeStrategy
  extends SequencerModule<AdaptiveFeeStrategyConfig>
  implements FeeStrategy
{
  private mempoolFeesCache = new TtlCache<number[]>({
    ttlMs: MEMPOOL_CACHE_TIMEOUT_MS,
    label: "AdaptiveFeeStrategy(mempool)",
    load: async () => {
      const { client } = this;
      if (client === undefined) return undefined;

      const result = await client
        .query<MempoolFeesQueryResult>(MempoolFeesQuery, {})
        .toPromise();
      return (
        result.data?.pooledZkappCommands?.map((tx) =>
          Number(tx?.zkappCommand?.feePayer?.body?.fee)
        ) ?? []
      );
    },
  });

  private lastBlockFeesCache = new TtlCache<number[]>({
    ttlMs: BLOCK_CACHE_TIMEOUT_MS,
    label: "AdaptiveFeeStrategy(last-block)",
    load: async () => {
      const { client } = this;
      if (client === undefined) return undefined;

      const result = await client
        .query<BlockFeesQueryResult>(LastBlockFeesQuery, {})
        .toPromise();
      return (
        result.data?.bestChain?.[0]?.transactions?.zkappCommands?.map((cmd) =>
          Number(cmd?.zkappCommand?.feePayer?.body?.fee)
        ) ?? []
      );
    },
  });

  private initializedClient?: Client;

  public constructor(
    // BaseLayer should provide a graphql URL on remote/lightnet Mina networks.
    @inject("BaseLayer", { isOptional: true })
    private readonly baseLayer: unknown
  ) {
    super();
  }

  private get mempoolLargeSize(): number {
    return this.config.mempoolLargeSize ?? DEFAULT_MEMPOOL_LARGE_SIZE;
  }

  private get mempoolNthHighest(): number {
    return this.config.mempoolNthHighest ?? DEFAULT_MEMPOOL_NTH_HIGHEST;
  }

  private get lastBlockNthLowest(): number {
    return this.config.lastBlockNthLowest ?? DEFAULT_LAST_BLOCK_NTH_LOWEST;
  }

  private get fallbackFee(): number {
    return this.config.fallbackFee ?? DEFAULT_FALLBACK_FEE;
  }

  private resolveGraphqlUrlFromBaseLayer(): string | undefined {
    if (!(this.baseLayer instanceof MinaBaseLayer)) {
      return undefined;
    }
    const { network } = this.baseLayer.config;
    return network.type === "local" ? undefined : network.graphql;
  }

  private get client(): Client | undefined {
    const url = this.resolveGraphqlUrlFromBaseLayer();
    if (url === undefined) return undefined;

    if (this.initializedClient === undefined) {
      this.initializedClient = new Client({
        url,
        exchanges: [fetchExchange],
      });
    }
    return this.initializedClient;
  }

  private computeFee(mempoolFees: number[], lastBlockFees: number[]): number {
    let baseline = this.fallbackFee;
    if (mempoolFees.length >= this.mempoolLargeSize) {
      // For large mempools, use the n-th highest fee from the mempool.
      const feesDescending = [...mempoolFees].sort((a, b) => b - a);
      baseline =
        feesDescending[
          clamp(this.mempoolNthHighest - 1, 0, feesDescending.length - 1)
        ];
    } else {
      // For small mempools, use the n-th lowest fee from the last block.
      const feesAscending = [...lastBlockFees].sort((a, b) => a - b);
      baseline =
        feesAscending[
          clamp(this.lastBlockNthLowest - 1, 0, feesAscending.length - 1)
        ];
    }
    return clamp(baseline, this.config.minFee, this.config.maxFee);
  }

  public async getFee(): Promise<number> {
    const now = Date.now();
    const [mempoolFees, lastBlockFees] = await Promise.all([
      this.mempoolFeesCache.get(now),
      this.lastBlockFeesCache.get(now),
    ]);
    return this.computeFee(mempoolFees ?? [], lastBlockFees ?? []);
  }

  public async start() {
    noop();
  }
}
