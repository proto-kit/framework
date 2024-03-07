import { log } from "@proto-kit/common";
import {
  InMemoryStateService,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  StateServiceProvider,
} from "@proto-kit/protocol";
import {
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import { Sequencer, SequencerModulesRecord } from "@proto-kit/sequencer";
import { GraphqlClient } from "../graphql/GraphqlClient";
import { GraphqlQueryTransportModule } from "../graphql/GraphqlQueryTransportModule";
import { GraphqlNetworkStateTransportModule } from "../graphql/GraphqlNetworkStateTransportModule";
import { GraphqlTransactionSender } from "../graphql/GraphqlTransactionSender";
import { AuroSigner } from "../transaction/AuroSigner";
import { AppChain, AppChainModulesRecord } from "./AppChain";
import { container } from "tsyringe";

export class ClientAppChain<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord &
    MandatoryProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> extends AppChain<
  RuntimeModules,
  ProtocolModules,
  SequencerModules,
  AppChainModules
> {
  public static fromRuntime<RuntimeModules extends RuntimeModulesRecord>(
    runtimeModules: RuntimeModules
  ) {
    const appChain = new ClientAppChain({
      Runtime: Runtime.from({
        modules: VanillaRuntimeModules.with(runtimeModules),
      }),
      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with({}),
      }),
      Sequencer: Sequencer.from({
        modules: {},
      }),

      modules: {
        GraphqlClient,
        Signer: AuroSigner,
        TransactionSender: GraphqlTransactionSender,
        QueryTransportModule: GraphqlQueryTransportModule,
        NetworkStateTransportModule: GraphqlNetworkStateTransportModule,
      },
    });

    appChain.configurePartial({
      GraphqlClient: {
        url: "http://127.0.0.1:8080/graphql",
      },
    });

    /**
     * Register state service provider globally,
     * to avoid providing an entire sequencer.
     *
     * Alternatively we could register the state service provider
     * in runtime's container, but i think the event emitter proxy
     * instantiates runtime/runtime modules before we can register
     * the mock state service provider.
     */
    const stateServiceProvider = new StateServiceProvider();
    stateServiceProvider.setCurrentStateService(new InMemoryStateService());
    container.registerInstance("StateServiceProvider", stateServiceProvider);

    return appChain;
  }

  public async start() {
    log.setLevel("ERROR");
    await super.start();
  }
}
