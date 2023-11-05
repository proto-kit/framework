/* eslint-disable import/no-unused-modules */
import { Signature } from "o1js";
import { injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";
import { Signer } from "./InMemorySigner";

@injectable()
export class AuroSigner extends AppChainModule<unknown> implements Signer {
  public async sign(message: any[]): Promise<any> {
    console.log("signing", message);
    const response = await (window as any).mina.signFields({
      message: message.map((field) => field.toString()),
    });
    console.log("response", response);
    return Signature.fromBase58(response.signature);
  }
}
