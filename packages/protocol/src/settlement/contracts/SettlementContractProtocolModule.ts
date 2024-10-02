import { TypedClass } from "@proto-kit/common";
import { SmartContract } from "o1js";
import { inject, injectable, injectAll } from "tsyringe";

import { BlockProvable } from "../../prover/block/BlockProvable";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "../ContractModule";
import { ProvableSettlementHook } from "../modularity/ProvableSettlementHook";

import { DispatchContractType } from "./DispatchSmartContract";
import {
  LazyBlockProof,
  SettlementContractType,
  SettlementSmartContract,
  SettlementSmartContractBase,
} from "./SettlementSmartContract";
import { BridgeContractBase, BridgeContractType } from "./BridgeContract";

export type SettlementContractConfig = {
  escapeHatchSlotsInterval?: number;
};

// 24 hours
const DEFAULT_ESCAPE_HATCH = (60 / 3) * 24;

export type SettlementContractModuleDependencies = [
  TypedClass<DispatchContractType & SmartContract>,
  TypedClass<BridgeContractType> & typeof SmartContract,
];

@injectable()
export class SettlementContractProtocolModule extends ContractModule<
  SettlementContractType,
  SettlementContractModuleDependencies,
  SettlementContractConfig
> {
  public constructor(
    @injectAll("ProvableSettlementHook")
    private readonly hooks: ProvableSettlementHook<unknown>[],
    @inject("BlockProver")
    private readonly blockProver: BlockProvable
  ) {
    LazyBlockProof.tag = blockProver.zkProgrammable.zkProgram.Proof.tag;
    super();
  }

  public contractFactory([
    dispatchContract,
    bridgeContract,
  ]: SettlementContractModuleDependencies): SmartContractClassFromInterface<SettlementContractType> {
    const { hooks, config } = this;

    const escapeHatchSlotsInterval =
      config.escapeHatchSlotsInterval ?? DEFAULT_ESCAPE_HATCH;

    SettlementSmartContractBase.args = {
      DispatchContract: dispatchContract,
      hooks,
      escapeHatchSlotsInterval,
      BridgeContract: bridgeContract,
      BridgeContractVerificationKey: undefined,
      BridgeContractPermissions: undefined,
      signedSettlements: undefined,
    };

    // Ideally we don't want to have this cyclic dependency, but we have it in the protocol,
    // So its logical that we can't avoid that here
    BridgeContractBase.args.SettlementContract = SettlementSmartContract;

    return SettlementSmartContract;
  }
}
