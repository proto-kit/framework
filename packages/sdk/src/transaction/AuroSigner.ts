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
    }
  | {
      type: "ERROR_SIGNATURE";
    };

export class AuroSignerHandler {
  public static fromWorker(worker: Worker): AuroSignerHandler {
    return new AuroSignerHandler(worker);
  }

  public constructor(public worker: Worker) {}

  public handleSignRequests() {
    const listener = (message: MessageEvent<any>) => {
      if (
        message.data?.type === ("REQUEST_SIGNATURE" satisfies Message["type"])
      ) {
        (window as any).mina
          .signFields({
            message: message.data.data,
          })
          .catch(() => {
            this.worker.postMessage({
              type: "ERROR_SIGNATURE",
            } satisfies Message);
          })
          .then(({ signature }: { signature: string }) => {
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
        if (
          message.data?.type == ("RESPONSE_SIGNATURE" satisfies Message["type"])
        ) {
          const signature = Signature.fromBase58(message.data.data);
          self.removeEventListener("message", listener);

          return resolve(signature);
        }
      };

      self.addEventListener("message", listener);

      self.postMessage({
        type: "REQUEST_SIGNATURE",
        data: signatureData.map((field) => field.toString()),
      } satisfies Message);
    });
  }
}
