import { inject, injectable, injectAll } from "tsyringe";
import { ProtocolModule } from "../protocol/ProtocolModule";
import { ProvableSettlementHook } from "./ProvableSettlementHook";
import { BlockProvable } from "../prover/block/BlockProvable";
import { method as o1jsMethodDecorator, PublicKey, SmartContract } from "o1js";
import {
  LazyBlockProof,
  SettlementContract,
  SettlementContractType,
  SettlementMethodIdMapping,
} from "./SettlementContract";
import { AreProofsEnabled, OmitKeys, TypedClass } from "@proto-kit/common";
import { ProtocolEnvironment } from "../protocol/ProtocolEnvironment";
import { DispatchContract, DispatchContractType } from "./DispatchContract";

type SettlementContractFactory = (
  address: PublicKey,
  dispatchContract: DispatchContract,
  hooks: ProvableSettlementHook<unknown>[],
  withdrawalStatePath: [string, string],
  escapeHatchSlotsInterval: number
) => SettlementContract;

type DispatchContractFactory = (
  address: PublicKey,
  methodIdMappings: Record<string, bigint>,
  incomingMessagesPaths: Record<string, `${string}.${string}`>
) => DispatchContract;

export type SettlementContractClass = TypedClass<SettlementContract> &
  OmitKeys<typeof SmartContract, "new">;
export type DispatchContractClass = TypedClass<DispatchContract> &
  OmitKeys<typeof SmartContract, "new">;

export interface SettlementContractModuleConfig {
  withdrawalStatePath: `${string}.${string}`;
  withdrawalMethodPath: `${string}.${string}`;
  incomingMessagesMethods: Record<string, `${string}.${string}`>;

  escapeHatchSlotsInterval?: number;

  dispatchContract?: {
    typedClass: DispatchContractClass;
    factory: DispatchContractFactory;
  };
  settlementContract?: {
    typedClass: SettlementContractClass;
    factory: SettlementContractFactory;
  };
}

@injectable()
export class SettlementContractModule extends ProtocolModule<SettlementContractModuleConfig> {
  public constructor(
    @injectAll("ProvableSettlementHook")
    private readonly hooks: ProvableSettlementHook<unknown>[],
    @inject("BlockProver")
    private readonly blockProver: BlockProvable
  ) {
    super();
    LazyBlockProof.tag = blockProver.zkProgrammable.zkProgram.Proof.tag;
  }

  // ** For protocol module
  public protocol?: ProtocolEnvironment;

  public get appChain(): AreProofsEnabled | undefined {
    return this.protocol?.getAreProofsEnabled();
  }
  // **

  public addMethodsToContractPrototype<Sub extends SettlementContract>(
    contract: typeof SettlementContract,
    sub: Sub
  ) {
    let methodTypes: (keyof Sub)[] = Reflect.getMetadata(
      "protokit-contract-methods",
      Object.getPrototypeOf(sub)
    );
    for (let methodName of methodTypes) {
      const method = sub[methodName];
      const descriptor: PropertyDescriptor = {
        value: method,
      };
      (contract.prototype as any)[methodName] = method;

      o1jsMethodDecorator(
        contract.prototype,
        methodName as keyof SettlementContract,
        descriptor
      );

      (contract.prototype as any)[methodName] = descriptor.value;
    }
  }

  public getContractClasses(): {
    settlement: SettlementContractClass;
    dispatch: DispatchContractClass;
  } {
    const settlement =
      this.config.settlementContract?.typedClass ?? SettlementContract;
    const dispatch =
      this.config.dispatchContract?.typedClass ?? DispatchContract;

    return {
      settlement,
      dispatch,
    };
  }

  public createContracts(
    addresses: {
      settlement: PublicKey;
      dispatch: PublicKey;
    },
    methodIdMappings: SettlementMethodIdMapping
  ): {
    settlement: SettlementContract;
    dispatch: DispatchContract;
  } {
    // We know that this returns [string, string], but TS can't infer that
    const withdrawalPath = this.config.withdrawalStatePath.split(".");
    // Default: 24 hours
    const escapeHatchInterval =
      this.config.escapeHatchSlotsInterval ?? (60 / 3) * 24;

    const dispatchFactory =
      this.config.dispatchContract?.factory ??
      ((address, methodIdMappings, incomingMessagesPaths) =>
        new DispatchContract(address, methodIdMappings, incomingMessagesPaths));

    const dispatch = dispatchFactory(
      addresses.dispatch,
      methodIdMappings,
      this.config.incomingMessagesMethods
    );

    const settlementFactory: SettlementContractFactory =
      this.config.settlementContract?.factory ??
      ((
        address,
        dispatchContract,
        hooks,
        withdrawalStatePath,
        escapeHatchSlotsInterval
      ) =>
        new SettlementContract(
          address,
          dispatchContract,
          hooks,
          withdrawalStatePath,
          escapeHatchSlotsInterval
        ));

    const settlement = settlementFactory(
      addresses.settlement,
      dispatch,
      this.hooks,
      [withdrawalPath[0], withdrawalPath[1]],
      escapeHatchInterval
    );

    return {
      dispatch,
      settlement,
    };
  }
}
