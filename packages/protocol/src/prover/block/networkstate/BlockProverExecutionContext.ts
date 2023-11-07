import { singleton } from "tsyringe";
import { FlexibleProvablePure, Struct } from "o1js";
import _ from "lodash";

export class BlockProverExecutionResult {

  private types: Record<string, FlexibleProvablePure<unknown>> = {}
  private values: Record<string, unknown> = {}

  public generateStruct(){

    const c = class Anon extends Struct(this.types){}

    return c;
  }
}

@singleton()
export class BlockProverExecutionContext {

  public setState(){

  }

}

Struct({})