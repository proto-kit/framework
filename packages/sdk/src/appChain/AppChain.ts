import { AreProofsEnabled, ModulesConfig } from "@yab/common";
import { Runtime, RuntimeModulesRecord } from "@yab/module";
import { Sequencer, SequencerModulesRecord } from "@yab/sequencer";
import {
  Protocol,
  ProtocolModulesRecord,
} from "@yab/protocol/src/protocol/Protocol";
import { StateTransitionWitnessProviderReference } from "@yab/protocol";

export interface AppChainDefinition<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord
> {
  runtime: Runtime<RuntimeModules>;
  protocol: Protocol<ProtocolModules>;
  sequencer: Sequencer<SequencerModules>;
}

/**
 * Definition of required arguments for AppChain
 */
export interface AppChainConfig<
  RuntimeModules extends RuntimeModulesRecord,
  SequencerModules extends SequencerModulesRecord
> {
  runtime: ModulesConfig<RuntimeModules>;
  sequencer: ModulesConfig<SequencerModules>;
}

/**
 * AppChain acts as a wrapper connecting Runtime, Protocol and Sequencer
 */
export class AppChain<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord
> implements AreProofsEnabled
{
  // alternative AppChain constructor
  public static from<
    RuntimeModules extends RuntimeModulesRecord,
    ProtocolModules extends ProtocolModulesRecord,
    SequencerModules extends SequencerModulesRecord
  >(
    definition: AppChainDefinition<
      RuntimeModules,
      ProtocolModules,
      SequencerModules
    >
  ) {
    return new AppChain(definition);
  }

  public constructor(
    public definition: AppChainDefinition<
      RuntimeModules,
      ProtocolModules,
      SequencerModules
    >
  ) {}

  public get runtime(): Runtime<RuntimeModules> {
    return this.definition.runtime;
  }

  public get sequencer(): Sequencer<SequencerModules> {
    return this.definition.sequencer;
  }

  public get protocol(): Protocol<ProtocolModules> {
    return this.definition.protocol;
  }

  /**
   * Set config of the current AppChain and its underlying components
   * @param config
   */
  public configure(config: AppChainConfig<RuntimeModules, SequencerModules>) {
    this.runtime.configure(config.runtime);
    this.sequencer.configure(config.sequencer);
  }

  /**
   * Starts the appchain and cross-registers runtime to sequencer
   */
  public async start() {
    [this.runtime, this.protocol, this.sequencer].forEach((container) => {
      container.registerValue({ AppChain: this });
    });

    this.protocol.registerValue({
      Runtime: this.runtime,
    });

    // Hacky workaround to get protocol and sequencer to have
    // access to the same WitnessProviderReference
    const reference = new StateTransitionWitnessProviderReference();
    this.protocol.dependencyContainer.register(
      "StateTransitionWitnessProviderReference",
      {
        useValue: reference,
      }
    );
    this.sequencer.dependencyContainer.register(
      "StateTransitionWitnessProviderReference",
      {
        useValue: reference,
      }
    );

    this.sequencer.registerValue({
      Runtime: this.runtime,
      Protocol: this.protocol,
    });

    await this.sequencer.start();
  }

  // eslint-disable-next-line no-warning-comments
  // TODO
  private proofsEnabled: boolean = false;

  public get areProofsEnabled(): boolean {
    return this.proofsEnabled;
  }

  public setProofsEnabled(areProofsEnabled: boolean): void {
    this.proofsEnabled = areProofsEnabled;
  }
}
