import "reflect-metadata";
import { container } from "tsyringe";
import loglevel from "loglevel";

import { loadUserModules } from "../utils/loadUserModules";

export default async function (): Promise<void> {
  console.log("Analyzing circuit sizes...");
  const { PrivateKey } = await import("o1js");
  process.env.PROTOKIT_TRANSACTION_FEE_RECIPIENT_PUBLIC_KEY =
    PrivateKey.random().toPublicKey().toBase58();

  const { Runtime } = await import("@proto-kit/module");
  const { Protocol, RuntimeVerificationKeyRootService, ContractArgsRegistry } =
    await import("@proto-kit/protocol");
  const { AppChain, Sequencer, CircuitAnalysisModule } =
    await import("@proto-kit/sequencer");
  const {
    CompileRegistry,
    ChildVerificationKeyService,
    MOCK_VERIFICATION_KEY,
  } = await import("@proto-kit/common");

  const { runtime, protocol } = await loadUserModules();

  const appChain = AppChain.from({
    Runtime: Runtime.from(runtime.modules),
    Protocol: Protocol.from({
      ...protocol.modules,
      ...protocol.settlementModules,
    }),
    Sequencer: Sequencer.from({}),
  });

  appChain.configure({
    Runtime: runtime.config,
    Protocol: {
      ...protocol.config,
      ...protocol.settlementModulesConfig,
    },
    Sequencer: {},
  });
  
  loglevel.setLevel("SILENT");

  const chainContainer = container.createChildContainer();
  await appChain.start(false, chainContainer);

  appChain.protocol.dependencyContainer
    .resolve(RuntimeVerificationKeyRootService)
    .setRoot(0n);

  if (protocol.settlementModules !== undefined) {
    const { SignedSettlementPermissions } =
      await import("@proto-kit/sequencer");

    const compileRegistry =
      appChain.protocol.dependencyContainer.resolve(CompileRegistry);
    const dummyVk = MOCK_VERIFICATION_KEY;
    compileRegistry.addArtifactsRaw({
      BlockProver: { verificationKey: dummyVk },
      BridgeContract: { verificationKey: dummyVk },
    });

    const childVkService = appChain.protocol.dependencyContainer.resolve(
      ChildVerificationKeyService
    );
    childVkService.setCompileRegistry(compileRegistry);

    const permissions = new SignedSettlementPermissions();
    const argsRegistry =
      appChain.protocol.dependencyContainer.resolve(ContractArgsRegistry);
    argsRegistry.addArgs("SettlementContract", {
      signedSettlements: true,
      BridgeContractPermissions: permissions.bridgeContractMina(),
    });
  }
  try {
    const analysisModule = appChain.protocol.dependencyContainer.resolve(
      CircuitAnalysisModule
    );

    loglevel.setLevel("INFO");
    await analysisModule.printSummary();
  } finally {
    loglevel.setLevel("SILENT");
    await appChain.close();
    loglevel.setLevel("INFO");
  }
}
