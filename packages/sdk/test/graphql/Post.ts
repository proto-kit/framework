import {
  RuntimeModule,
  runtimeMethod,
  runtimeModule,
  state,
} from "@proto-kit/module";
import { StateMap } from "@proto-kit/protocol";
import {
  CircuitString,
  Field,
  Poseidon,
  PublicKey,
  Struct,
  UInt64,
} from "o1js";

export class Post extends Struct({
  message: CircuitString,
  author: PublicKey,
  createdAt: UInt64,
}) {
  get id() {
    return Poseidon.hash(Post.toFields(this));
  }
}

@runtimeModule()
export class MessageBoard extends RuntimeModule<Record<string, never>> {
  @state() public posts = StateMap.from(Field, Post);

  @runtimeMethod()
  public post(message: CircuitString) {
    const post = new Post({
      message,
      author: this.transaction.sender.value,
      createdAt: this.network.block.height,
    });

    this.posts.set(post.id, post);
  }
}
