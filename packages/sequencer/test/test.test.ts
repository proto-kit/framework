import { Pickles } from "../../../node_modules/snarkyjs/dist/node/snarky";

describe("test", () => {
  it("dummyproof", () => {
    console.log("creating dummy proof");
    const dummyBase64Proof = Pickles.dummyBase64Proof();
    console.log("Pickles proof of base64 ");
    const [, proof] = Pickles.proofOfBase64(dummyBase64Proof, 2);
  })
})