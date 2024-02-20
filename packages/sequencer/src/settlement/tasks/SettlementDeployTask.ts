import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Task } from "../../worker/flow/Task";
import { Mina, PrivateKey, PublicKey, Types, UInt64 } from "o1js";
import {
  Protocol,
  ProtocolModulesRecord,
  ReturnType,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { TaskSerializer } from "../../worker/manager/ReducableTask";
import { CompileRegistry } from "../../protocol/production/tasks/CompileRegistry";

// type PartialAccount = Parameters<typeof addCachedAccount>[0];
type PartialAccount = {
  address: PublicKey;
  balance: UInt64;
};

export type DeployTaskArgs = {
  proofsEnabled: boolean;
  transaction: Mina.Transaction;
  // deployment: {
  //   zkappKey: PrivateKey;
  //   address: PublicKey;
  // };
  // accounts: PartialAccount[];
  // network: {
  //   local: boolean;
  //   graphql?: string;
  //   archive?: string;
  // };
  // transaction: {
  //   sender: PublicKey;
  //   nonce: number;
  //   fee: string;
  // };
};

type DeployResult = {
  transaction: Mina.Transaction;
};

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class SettlementDeployTask
  implements Task<DeployTaskArgs, DeployResult>
{
  public name = "deploySettlement";

  public settlementContractModule: SettlementContractModule;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<ProtocolModulesRecord>,
    private readonly compileRegistry: CompileRegistry
  ) {
    this.settlementContractModule =
      this.protocol.dependencyContainer.resolve<SettlementContractModule>(
        "SettlementContractModule"
      );
  }

  public async compute(input: DeployTaskArgs): Promise<DeployResult> {
    const { proofsEnabled, transaction } = input;

    const network = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(network);

    await transaction.prove();

    return { transaction };
  }

  public async compute2(input: DeployTaskArgs): Promise<DeployResult> {
    const proofsEnabled = false;

    await input.transaction.prove();

    // const { deployment, transaction, network } = input;
    // const { sender, nonce, fee } = transaction;
    // const { address, zkappKey } = deployment;
    //
    // const verificationKey =
    //   this.compileRegistry.getContractVerificationKey("SettlementContract");
    //
    // if (verificationKey === undefined && proofsEnabled) {
    //   throw new Error("SmartContract hasn't been compiled yet");
    // }
    //
    // const mina = network.local
    //   ? Mina.LocalBlockchain({ proofsEnabled: false })
    //   : Mina.Network({
    //       mina: network.graphql!,
    //       archive: network.archive!,
    //     });
    // Mina.setActiveInstance(mina);
    // input.accounts.forEach((account) => {
    //   (mina as ReturnType<typeof Mina.LocalBlockchain>).addAccount(account.address, account.balance.toString());
    //   // addCachedAccount(account)
    // });

    // const contract = this.settlementContractModule.createContract(address, );
    //
    // const tx = await Mina.transaction(
    //   { sender, nonce, fee, memo: "Protokit settlement deploy" },
    //   () => {
    //     AccountUpdate.fundNewAccount(sender);
    //     contract.deploy({
    //       zkappKey,
    //       verificationKey: verificationKey?.verificationKey ?? undefined,
    //     });
    //   }
    // );
    // await tx.prove();
    //
    // const json = tx.toJSON();
    // const jsonObject: Types.Json.ZkappCommand = JSON.parse(json);
    // const r = Mina.Transaction.fromJSON(jsonObject);
    // const json2 = r.toJSON()

    // return tx;
    return undefined as any;
  }

  public inputSerializer(): TaskSerializer<DeployTaskArgs> {
    type JsonInputObject = {
      transaction: string;
      proofsEnabled: boolean;
    };
    return {
      fromJSON: (json: string): DeployTaskArgs => {
        const jsonObject = JSON.parse(json) as JsonInputObject;
        const commandJson: Types.Json.ZkappCommand = JSON.parse(
          jsonObject.transaction
        );
        return {
          transaction: Mina.Transaction.fromJSON(commandJson),
          proofsEnabled: jsonObject.proofsEnabled,
        };
      },

      toJSON(input: DeployTaskArgs): string {
        const transaction = input.transaction.toJSON();
        const jsonObject: JsonInputObject = {
          transaction,
          proofsEnabled: input.proofsEnabled,
        };
        return JSON.stringify(jsonObject);
      },
    };
    // return {
    //   fromJSON: (json: string): DeployTaskArgs => {
    //     const decoded = JSON.parse(json);
    //     return {
    //       accounts: (decoded.accounts as any[]).map((acc) => ({
    //         address: PublicKey.fromBase58(acc["address"]),
    //         balance: UInt64.from(acc["balance"]),
    //       })),
    //       deployment: {
    //         zkappKey: PrivateKey.fromBase58(decoded.deployment.zkappKey),
    //         address: PublicKey.fromBase58(decoded.deployment.address),
    //       },
    //       transaction: {
    //         sender: PublicKey.fromBase58(decoded.transaction.sender),
    //         nonce: decoded.transaction.nonce,
    //         fee: decoded.transaction.fee,
    //       },
    //       network: {
    //         local: decoded.network.local,
    //         graphql: decoded.network.graphql,
    //         archive: decoded.network.archive,
    //       },
    //     };
    //   },
    //   toJSON(input: DeployTaskArgs): string {
    //     return JSON.stringify({
    //       deployment: {
    //         zkappKey: input.deployment.zkappKey.toBase58(),
    //         address: input.deployment.address.toBase58(),
    //       },
    //       transaction: {
    //         sender: input.transaction.sender.toBase58(),
    //         nonce: input.transaction.nonce,
    //         fee: input.transaction.fee,
    //       },
    //       network: {
    //         local: input.network.local,
    //         graphql: input.network.graphql,
    //         archive: input.network.archive,
    //       },
    //       accounts: input.accounts.map((account) => ({
    //         // tokenId: account.tokenId?.toString(),
    //         address: account.address?.toBase58(),
    //         // nonce: account.nonce?.toString(),
    //         balance: account.balance?.toString(),
    //       })),
    //     });
    //   },
    // };
  }

  public async prepare(): Promise<void> {
    const contract = this.settlementContractModule.getContractClass();
    await this.compileRegistry.compileSmartContract(
      "SettlementContract",
      contract
    );
    await contract.compile();
  }

  public resultSerializer(): TaskSerializer<DeployResult> {
    return {
      fromJSON: (json: string) => {
        const jsonObject: Types.Json.ZkappCommand = JSON.parse(json);
        return { transaction: Mina.Transaction.fromJSON(jsonObject) };
      },

      toJSON(input: DeployResult): string {
        return input.transaction.toJSON();
      },
    };
  }
}
