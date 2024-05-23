/* eslint-disable import/no-unused-modules */
import { Field, Signature } from "o1js";
import { injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";
import { Signer } from "./InMemorySigner";

@injectable()
export class AuroSigner extends AppChainModule<unknown> implements Signer {
  public async sign(message: Field[]): Promise<Signature> {
    try {
    const response = await (window as any).mina.signFields({
      message: message.map((field) => field.toString()),
    });
    return Signature.fromBase58(response.signature);
  } catch (e: any) {
    if (e?.code == 1001) {
      await (window as any).mina.requestAccounts();
      return await this.sign(message);
    }
    throw e;
  }}
}
