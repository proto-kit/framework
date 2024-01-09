/* eslint-disable import/no-unused-modules */
import { injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";
import { Signer } from "./InMemorySigner";

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
          .then((response: { signature: string } | undefined) => {
            if (response?.signature) {
              this.worker.postMessage({
                type: "RESPONSE_SIGNATURE",
                data: response.signature,
              } satisfies Message);
            } else {
              this.worker.postMessage({
                type: "ERROR_SIGNATURE",
              } satisfies Message);
            }
          });
      }
    };

    this.worker.addEventListener("message", listener);
  }
}

@injectable()
export class AuroSigner extends AppChainModule implements Signer {
  public async sign(signatureData: any[]): Promise<any> {
    const { Signature } = await import("o1js");

    return await new Promise(async (resolve, reject) => {
      const listener = async (message: MessageEvent<any>) => {
        if (
          message.data?.type == ("RESPONSE_SIGNATURE" satisfies Message["type"])
        ) {
          const signature = Signature.fromBase58(message.data.data);
          self.removeEventListener("message", listener);

          return resolve(signature);
        }

        if (
          message.data?.type == ("ERROR_SIGNATURE" satisfies Message["type"])
        ) {
          self.removeEventListener("message", listener);

          return reject();
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
