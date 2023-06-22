import {
  sequencerDependency,
  sequencerModule,
  SequencerModule
} from "../../sequencer/builder/SequencerModule";
import { InMemoryStateService, StateService } from "@yab/module";
import { Field } from "snarkyjs";
import { registry } from "tsyringe";

@sequencerModule()
@registry([
  {  }
])
export class PostgresStateModule extends SequencerModule<{ }>{

  start(): Promise<void> {
    return Promise.resolve(undefined);
  }

  @sequencerDependency()
  stateService() : StateService{
    const service = new InMemoryStateService();
    service.set(Field(1), [Field(2)])
    return service
  }

}