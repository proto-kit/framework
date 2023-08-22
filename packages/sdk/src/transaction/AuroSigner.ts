/* eslint-disable import/no-unused-modules */
import { injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";
import { Signer } from "./InMemorySigner";
import * as Comlink from "comlink";

export type Message =
  | {
      type: "REQUEST_SIGNATURE";
      data: string[];
    }
  | {
      type: "RESPONSE_SIGNATURE";
      data: string;
    };

export class AuroSignerHandler {
  public static fromWorker(worker: Worker): AuroSignerHandler {
    return new AuroSignerHandler(worker);
  }

  public constructor(public worker: Worker) {}

  public handleSignRequests() {
    const listener = (message: MessageEvent<any>) => {
      console.log("window received REQUEST_SIGNATURE", message.data);
      if (
        message.data?.type === ("REQUEST_SIGNATURE" satisfies Message["type"])
      ) {
        console.log("please sign", message.data.data);
        (window as any).mina
          .signFields({
            message: message.data.data,
          })
          .then(({ signature }: { signature: string }) => {
            console.log("window sending RESPONSE_SIGNATURE", signature);
            this.worker.postMessage({
              type: "RESPONSE_SIGNATURE",
              data: signature,
            } satisfies Message);
          });
      }
    };

    this.worker.addEventListener("message", listener);
  }
}

@injectable()
export class AuroSigner extends AppChainModule<unknown> implements Signer {
  public async sign(signatureData: any[]): Promise<any> {
    const { Signature } = await import("snarkyjs");

    return await new Promise(async (resolve) => {
      const listener = async (message: MessageEvent<any>) => {
        console.log("received signature", message.data);
        if (
          message.data?.type == ("RESPONSE_SIGNATURE" satisfies Message["type"])
        ) {
          const signature = Signature.fromBase58(message.data.data);
          console.log("resolving with signature", signature);
          self.removeEventListener("message", listener);

          return resolve(signature);
        }
      };

      self.addEventListener("message", listener);

      console.log(
        "sending REQUEST_SIGNATURE",
        signatureData.map((f) => f.toString())
      );
      self.postMessage({
        type: "REQUEST_SIGNATURE",
        data: signatureData.map((field) => field.toString()),
      } satisfies Message);
    });
  }
}
