import { AsyncStateService, StateServiceCreator } from "@proto-kit/sequencer";
import { inject, injectable } from "tsyringe";

import { PrismaStateService } from "../services/prisma/PrismaStateService";
import type { PrismaConnection } from "../PrismaDatabaseConnection";

@injectable()
export class PrismaStateServiceCreator implements StateServiceCreator {
  public constructor(
    @inject("Database") private readonly connection: PrismaConnection
  ) {}

  public async createMask(
    name: string,
    parent: string
  ): Promise<AsyncStateService> {
    return new PrismaStateService(this.connection, name, parent);
  }

  public getMask(name: string): AsyncStateService {
    return new PrismaStateService(this.connection, name);
  }

  public async mergeIntoParent(name: string): Promise<void> {
    const service = new PrismaStateService(this.connection, name);
    await service.mergeIntoParent();
  }

  public async drop(name: string): Promise<void> {
    const service = new PrismaStateService(this.connection, name);
    await service.drop();
  }
}
