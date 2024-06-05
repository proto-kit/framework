import { OpcodeDefinitions, ProxyInstructions } from "./types";
import { ASTRecorder } from "./ASTRecorder";
import { ASTReplayer } from "./ASTReplayer";

export class ASTBuilder<Instructions extends OpcodeDefinitions> {
  public constructor(private readonly instructionSet: Instructions) {}

  public initialize(proxyInstructions: ProxyInstructions<Instructions>) {
    const recorder = new ASTRecorder(this.instructionSet);

    Object.entries(this.instructionSet).forEach(([key, value]) => {
      const proxyDef = proxyInstructions[key];
      proxyDef.proxyFunction(() => recorder);
    })

    const executor = new ASTReplayer(this.instructionSet, proxyInstructions)

    return { recorder, executor };
  }
}