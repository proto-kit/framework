import { type Bool, Circuit, Field, Poseidon } from "snarkyjs";
import { prefixToField } from "../../Utils.js";

export abstract class ProvableMerkleList {

  private internalCommitment: Field;

  public constructor(commitment: Field = Field(0)) {
    this.internalCommitment = commitment;
  }

  public get commitment() {
    return this.internalCommitment
  }

  protected abstract hash(e1: Field, e2: Field): Field

  public push(element: Field): Field {
    this.internalCommitment = this.hash(this.commitment, element);
    return this.internalCommitment;
  }

  public remove(preimage: Field, element: Field): Bool {
    const success = this.hash(preimage, element).equals(this.internalCommitment);
    this.internalCommitment = Circuit.if(success, preimage, this.internalCommitment);
    return success;
  }

}

export class DefaultProvableMerkleList extends ProvableMerkleList {

  public hash(e1: Field, e2: Field): Field {
    return Poseidon.hash([e1, e2]);
  }

}

export class PrefixedProvableMerkleList extends ProvableMerkleList {

  private readonly prefix: Field;

  public constructor(prefix: string) {
    super();
    this.prefix = prefixToField(prefix);
  }

  protected hash(e1: Field, e2: Field): Field {
    return Poseidon.hash([this.prefix, e1, e2]);
  }

}