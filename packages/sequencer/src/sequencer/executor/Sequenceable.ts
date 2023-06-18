import { ModuleContainer, ModulesConfig } from "@yab/common";

// eslint-disable-next-line import/no-cycle
import { SequencerModulesRecord } from "./Sequencer";

export interface Sequenceable<
  Modules extends SequencerModulesRecord,
  Config extends ModulesConfig<Modules>
> extends ModuleContainer<Modules, Config> {
  start: () => Promise<void>;
}
