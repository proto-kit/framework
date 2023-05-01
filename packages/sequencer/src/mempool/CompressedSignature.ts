import {Bool, Field, Scalar, Signature, Struct} from "snarkyjs";
import {NotInCircuit} from "../Utils.js";

//Not in circuit
export class CompressedSignature {

    r: Field
    s: string

    constructor(r: Field, s: string) {
        this.r = r;
        this.s = s;
    }

    @NotInCircuit()
    static fromSignature(sig: Signature){
        let s = Scalar.toJSON(sig.s)
        return new CompressedSignature(
            sig.r, s
        )
    }

    @NotInCircuit()
    toSignature() : Signature{

        let s = Scalar.fromJSON(this.s)

        return Signature.fromObject({
            r: this.r,
            s
        })
    }

}