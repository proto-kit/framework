import { injectable, singleton } from "tsyringe";

export interface StaticInitializationContract<Args> {
  getInitializationArgs(): Args;
}

@injectable()
@singleton()
export class ContractArgsRegistry {
  args: Record<string, any> = {};

  public setArgs<Type>(name: string, args: Type) {
    this.args[name] = args;
  }

  public getArgs<Type>(name: string): Type | undefined {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return this.args[name] as Type;
  }
}
