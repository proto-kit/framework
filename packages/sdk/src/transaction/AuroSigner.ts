import { Field, Signature } from "o1js";
import { injectable } from "tsyringe";

import { AppChainModule } from "../appChain/AppChainModule";

import { Signer } from "./InMemorySigner";

@injectable()
export class AuroSigner extends AppChainModule<unknown> implements Signer {
  public async sign(message: Field[]): Promise<Signature> {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-assignment
    const response = await (window as any).mina.signFields({
      message: message.map((field) => field.toString()),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return Signature.fromBase58(response.signature);
  }
}
