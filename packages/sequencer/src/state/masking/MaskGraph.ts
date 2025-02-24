function assertMaskFound<R>(
  service: R | undefined,
  name: string
): asserts service is R {
  if (service === undefined) {
    throw new Error(`Mask with name ${name} not found`);
  }
}

type Node<T, Child, Parent> = {
  mask: T;
  children: Child[];
  parent: Parent;
};

type BaseMaskType<Interface, Mask> = Interface & {
  createMask(name: string): Promise<Mask>;
  name: string;
};

type MaskType<Interface, Mask> = BaseMaskType<Interface, Mask> & {
  mergeIntoParent(): Promise<void>;
  updateParent(parent: Interface): void;
};

export class MaskGraph<
  Interface,
  Base extends BaseMaskType<Interface, Mask>,
  Mask extends MaskType<Interface, Mask>,
> {
  public constructor(base: Base) {
    this.root = {
      mask: base,
      children: [],
      parent: undefined,
    };
  }

  root: Node<Base, Mask, undefined>;

  masks: Record<string, Node<Mask, Mask, Mask | Base>> = {};

  private findMaskNode(name: string) {
    return this.masks[name];
  }

  private findNode(
    name: string
  ): Node<Mask | Base, Mask, Mask | Base | undefined> | undefined {
    if (name === "base") {
      return this.root;
    }
    return this.findMaskNode(name);
  }

  private findService(name: string): Mask | Base | undefined {
    return this.findNode(name)?.mask;
  }

  public getMask(name: string) {
    const candidate = this.findService(name);

    assertMaskFound(candidate, name);

    return candidate;
  }

  public async createMask(
    name: string,
    parentName: string,
    fallback?: string
  ): Promise<Interface> {
    const candidate = this.findService(name);
    if (candidate !== undefined) {
      return candidate;
    }

    let parent = this.findService(parentName);

    if (parent === undefined && fallback !== undefined) {
      parent = this.findService(fallback);
    }

    assertMaskFound(parent, `${parentName} | ${fallback}`);

    const mask = await parent.createMask(name);

    this.masks[name] = {
      mask,
      parent,
      children: [],
    };
    this.findNode(parentName)?.children.push(mask);

    return mask;
  }

  private removeFromGraph(name: string) {
    const node = this.findMaskNode(name);

    assertMaskFound(node, name);

    const { children, parent } = node;

    children.forEach((child) => {
      child.updateParent(parent!);
      this.findNode(child.name)!.parent = parent;
    });
    const parentNode = this.findNode(parent!.name)!;
    parentNode.children = parentNode.children.filter((c) => c !== node.mask);
    parentNode.children.push(...children);

    delete this.masks[name];

    return node.mask;
  }

  public async mergeIntoParent(name: string): Promise<void> {
    const mask = this.removeFromGraph(name);

    await mask.mergeIntoParent();
  }

  public async drop(name: string) {
    this.removeFromGraph(name);
  }
}
