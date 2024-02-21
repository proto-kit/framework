import { inject, injectable, injectAll } from "tsyringe";
import { ProtocolModule } from "../protocol/ProtocolModule";
import { ProvableSettlementHook } from "./ProvableSettlementHook";
import { BlockProvable } from "../prover/block/BlockProvable";
import { method as o1jsMethodDecorator, PublicKey } from "o1js";
import {
  LazyBlockProof,
  SettlementContract,
  SettlementMethodIdMapping,
} from "./SettlementContract";
import {
  AreProofsEnabled,
  TypedClass
} from "@proto-kit/common";
import { ProtocolEnvironment } from "../protocol/ProtocolEnvironment";

export interface SettlementContractModuleConfig {
  withdrawalStatePath: `${string}.${string}`;
  withdrawalMethodPath: `${string}.${string}`;
  incomingMessagesMethods: Record<string, `${string}.${string}`>;
  settlementContractClass: TypedClass<SettlementContract>;
}

@injectable()
export class SettlementContractModule<
  SettlementContractType extends SettlementContract
> extends ProtocolModule<SettlementContractModuleConfig> {
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

  public addMethodsToContractPrototype<Sub extends SettlementContract>(contract: typeof SettlementContract, sub: Sub){
    let methodTypes: (keyof Sub)[] = Reflect.getMetadata(
      'protokit-contract-methods',
      Object.getPrototypeOf(sub)
    );
    for(let methodName of methodTypes) {
      const method = sub[methodName]
      const descriptor: PropertyDescriptor = {
        value: method
      };
      (contract.prototype as any)[methodName] = method;

      o1jsMethodDecorator(contract.prototype, methodName as keyof SettlementContract, descriptor);

      (contract.prototype as any)[methodName] = descriptor.value;
    }
  }

  public getContractClass(): typeof SettlementContract {
    const contractClass = SettlementContract;

    const sub = this.config.settlementContractClass;

    return contractClass
  }

  public createContract(
    address: PublicKey,
    methodIdMappings: SettlementMethodIdMapping
  ): SettlementContract {
    // We know that this returns [string, string], but TS can't infer that
    const withdrawalPath = this.config.withdrawalStatePath.split(".");

    return new SettlementContract(
      address,
      methodIdMappings,
      this.hooks,
      [withdrawalPath[0], withdrawalPath[1]],
      this.config.incomingMessagesMethods
    );
  }
}
