/* eslint-disable import/no-unused-modules */
import { Field, PublicKey, Signature } from "o1js";
import { injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";
import { Signer } from "./InMemorySigner";

@injectable()
export class AuroSigner extends AppChainModule<unknown> implements Signer {
  public async sign(publicKey: PublicKey, message: Field[]): Promise<Signature> {
    // TODO Integrate multiple wallets from auro wallet into new signer api
    const response = await (window as any).mina.signFields({
      message: message.map((field) => field.toString()),
    });
    return Signature.fromBase58(response.signature);
  }
}
