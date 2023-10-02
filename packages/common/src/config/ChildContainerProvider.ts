import { DependencyContainer } from "tsyringe";

export interface ChildContainerProvider {
  (): DependencyContainer;
}
