import { Field, Signature } from "o1js";
import { injectable } from "tsyringe";
import { createStore } from '@mina-js/connect'

import { AppChainModule } from "../appChain/AppChainModule";

import { Signer } from "./InMemorySigner";

@injectable()
export class PalladSigner extends AppChainModule<unknown> implements Signer {
    public async sign(message: Field[]): Promise<Signature> {
        const store = createStore()
        const injectedProvider = store.getProviders().find((p) => p.info.slug === 'pallad')
        if (!injectedProvider) throw new Error('Pallad provider not found')
        const response = await injectedProvider.provider.request({ method: 'mina_signFields', params: [message.map((field) => field.toString())] })
        return Signature.fromBase58(response.result.signature);
    }
}
