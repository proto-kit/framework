/* eslint-disable import/no-unused-modules */
import { createMerkleTree } from "@proto-kit/common";
import {
  MethodIdResolver,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { inject } from "tsyringe";
import {
  ProvableTransactionHook,
  BlockProverExecutionData,
} from "@proto-kit/protocol";
import { Provable } from "o1js";

export const treeFeeHeight = 10;
export class FeeTree extends createMerkleTree(treeFeeHeight) {}

export interface TransactionWeight {
  methodId: bigint;
  weight: bigint;
}

export interface TransactionFeeHookConfig {
  feeOverrides: {
    [methodId: string]: {
      baseFee: bigint;
      perConstraintFee: bigint;
    };
  };
}

export class TransactionFeeHook extends ProvableTransactionHook<TransactionFeeHookConfig> {
  public constructor(
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
  }

  public feeTree: FeeTree = this.createFeeTree();

  public createFeeTree() {
    const analyzedMethods =
      this.runtime.zkProgrammable.zkProgram.analyzeMethods();

    console.log("analyzedMethods", analyzedMethods);

    return new FeeTree();
  }

  public onTransaction(executionData: BlockProverExecutionData): void {
    Provable.log("fee root", this.feeTree.getRoot());
  }
}
