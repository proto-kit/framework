import {Bool, Circuit, Field, Poseidon} from "snarkyjs";

export abstract class ProvableMerkleList {

    commitment: Field

    constructor(commitment: Field = Field(0)) {
        this.commitment = commitment
    }

    abstract hash(e1: Field, e2: Field) : Field

    push(element: Field) : Field {
        this.commitment = this.hash(this.commitment, element)
        return this.commitment
    }

    remove(preimage: Field, value: Field) : Bool {
        let success = this.hash(preimage, value).equals(this.commitment)
        this.commitment = Circuit.if(success, preimage, this.commitment)
        return success
    }

}

export class DefaultProvableMerkleList extends ProvableMerkleList {

    hash(e1: Field, e2: Field): Field {
        return Poseidon.hash([e1, e2]);
    }

}

export class PrefixedProvableMerkleList extends ProvableMerkleList {

    prefix: Field

    constructor(prefix: string) {
        super()
        this.prefix = Field(0) //TODO string -> Field mapping
    }

    hash(e1: Field, e2: Field): Field {
        return Poseidon.hash([this.prefix, e1, e2]);
    }

}