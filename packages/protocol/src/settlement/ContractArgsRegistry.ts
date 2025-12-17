import { injectable, singleton } from "tsyringe";

export interface StaticInitializationContract<Args> {
  getInitializationArgs(): Args;

  // name: string;
}

@injectable()
@singleton()
export class ContractArgsRegistry {
  args: Record<string, any> = {};

  public setArgs<Type>(
    // contract: TypedClass<StaticInitializationContract<Type>>,
    name: string,
    args: Type
  ) {
    this.args[name] = args;
  }

  public getArgs<Type>(
    // contract: TypedClass<StaticInitializationContract<Type>>
    name: string
  ): Type | undefined {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return this.args[name] as Type;
  }
}
