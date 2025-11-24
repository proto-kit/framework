import { Field, PrivateKey, PublicKey, Signature, Transaction } from "o1js";
import {
  sequencerModule,
  SequencerModule,
} from "../../sequencer/builder/SequencerModule";
import { MinaSigner } from "./MinaSigner";
import { noop } from "@proto-kit/common";

export type LocalMinaSignerConfig = {
  signers: PrivateKey[];
};

@sequencerModule()
export class LocalMinaSigner
  extends SequencerModule<LocalMinaSignerConfig>
  implements MinaSigner
{
  public getContractKeys(): PublicKey[] {
    return this.config.signers.map((signer) => signer.toPublicKey());
  }

  public sign(signatureData: Field[]): Signature {
    return Signature.create(this.config.signers[0], signatureData);
  }

  public signTransaction(tx: Transaction<any, false>): Transaction<any, true> {
    return tx.sign([...this.config.signers]);
  }

  public async start(): Promise<void> {
    noop();
  }
}
