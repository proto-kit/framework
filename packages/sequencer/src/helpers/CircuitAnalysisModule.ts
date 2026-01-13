import { inject, injectable } from "tsyringe";
import { RuntimeEnvironment } from "@proto-kit/module";
import { log, mapSequential, PlainZkProgram } from "@proto-kit/common";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  SettlementContractModule,
  SettlementModulesRecord,
} from "@proto-kit/protocol";

@injectable()
export class CircuitAnalysisModule {
  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<
      ProtocolModulesRecord & MandatoryProtocolModulesRecord
    >,
    @inject("Runtime")
    private readonly runtime: RuntimeEnvironment
  ) {}

  public async printSummary() {
    const summary = await this.analyseMethods();
    log.info(summary);
  }

  public async analyseMethods() {
    const zkProgrammables = [
      this.runtime,
      this.protocol.stateTransitionProver,
      this.protocol.transactionProver,
      this.protocol.blockProver,
    ];

    const zkProgrammablePromises = await mapSequential(
      zkProgrammables,
      (withZkProgrammable) =>
        mapSequential(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          withZkProgrammable.zkProgrammable.zkProgramFactory() as PlainZkProgram<
            unknown,
            unknown
          >[],
          async (program) => {
            const result = await program.analyzeMethods();
            return [program.name, result] as const;
          }
        )
    );

    const settlementModule = this.protocol.dependencyContainer.resolve<
      SettlementContractModule<SettlementModulesRecord>
    >("SettlementContractModule");

    const contractPromises = await mapSequential(
      Object.entries(settlementModule.getContractClasses()),
      async ([key, clas]) => {
        const result = await clas.analyzeMethods();
        return [key, result] as const;
      }
    );

    const allResults = [...zkProgrammablePromises.flat(), ...contractPromises];

    const summary = allResults.map(([program, result]) => {
      const methods = Object.entries(result).map(
        ([methodName, constraints]) => [methodName, constraints.rows] as const
      );
      return [program, Object.fromEntries(methods)] as const;
    });

    return Object.fromEntries(summary);
  }
}
