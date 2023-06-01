import { sequencerModule, SequencerModule } from "../../src/runtime/builder/SequencerModule";
import { FlipOptional } from "@yab/protocol";
import { inject, injectable } from "tsyringe";

interface DummyConfig{
  password: string,
  returnValue?: string
}

@sequencerModule()
export class DummyModule extends SequencerModule<DummyConfig> {
  get defaultConfig(): FlipOptional<DummyConfig> {
    return {
      returnValue: "default return",
    };
  }

  private handlerFn: (password: string) => undefined | string = () => undefined

  public call(password: string) : string | undefined{
    return this.handlerFn(password)
  }

  public async start(): Promise<void> {

    this.handlerFn = (password: string) => {
      if(this.config.password === password){
        return this.config.returnValue
      }else{
        return undefined
      }
    }

  }
}

@sequencerModule()
export class DummyModuleParent extends SequencerModule<{ passwordForChild: string }> {
  constructor(@inject("dummy") public readonly dummychild: DummyModule) {
    super();
  }

  public callChild(){
    return this.dummychild.call(this.config.passwordForChild)
  }

  public get defaultConfig(): FlipOptional<{ passwordForChild: string }> {
    return {};
  }

  public async start(): Promise<void> {
  }
}

export class DummyModuleWithoutDecorator extends SequencerModule<{}> {
  get defaultConfig(): FlipOptional<{}> {
    return {};
  }

  start(): Promise<void> {
    return Promise.resolve(undefined);
  }
}