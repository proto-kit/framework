/* eslint-disable no-console */

import { PrivateKey } from "o1js";

export type GenerateKeysArgs = {
  count?: number;
};

export default async function (args: GenerateKeysArgs) {
  const count = args.count ?? 1;
  console.log(`Generated ${count} keys for development purposes:`);
  console.log("-".repeat(70));
  for (let i = 0; i < count; i++) {
    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();
    console.log("Private key:", privateKey.toBase58());
    console.log("Public key:", publicKey.toBase58());
    console.log("-".repeat(70));
  }
}
/* eslint-enable no-console */
