import {Field, Poseidon} from "snarkyjs";

type ToFields = {
    toFields() : Field[]
}

export class MerkleList<T extends ToFields> {

    commitment: Field

    constructor() {
        this.commitment = Field(0)
    }

    hash(h1: Field, h2: Field) : Field {
        return Poseidon.hash(h1, h2)
    }

    push(f: T){

    }

}