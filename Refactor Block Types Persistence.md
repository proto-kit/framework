# Chat Conversation

## Block Production Flow: Provable vs Non-Provable

### Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SEQUENCING (Non-Provable)                         │
│  BlockProducerModule → BlockProductionService → TransactionExecutionService │
│                                                                             │
│  - Execute transactions                                                     │
│  - Collect state transitions                                                │
│  - Create Block (with TransactionExecutionResult)                           │
│  - Store to DB                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ (Block stored)
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TRACING (Non-Provable)                           │
│  BatchProducerModule → BatchTracingService → BlockTracingService            │
│                      → StateTransitionTracingService                        │
│                      → TransactionTracingService                            │
│                                                                             │
│  - Collect witnesses (merkle proofs, state values)                          │
│  - Prepare inputs for provers                                               │
│  - Still uses o1js types (Field, Bool) but NOT in-circuit                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓ (Trace created)
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PROVING (Provable/In-Circuit)                    │
│  BatchFlow → StateTransitionFlow → StateTransitionTask.compute()            │
│           → BlockFlow           → TransactionProvingTask.compute()          │
│                                 → NewBlockTask.compute()                    │
│                                                                             │
│  ⚡ THIS IS WHERE ZK PROOFS ARE GENERATED ⚡                                 │
│  - StateTransitionProver.prove*() methods                                   │
│  - BlockProver.proveTransaction/proveBlock() methods                        │
│  - executionContext.current().result.prove<BlockProof>()                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Detailed Breakdown

| Stage | File(s) | Provable? | Description |
|-------|---------|-----------|-------------|
| **1. Sequencing** | [BlockProductionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:0:0-0:0) | ❌ No | Executes transactions, creates [Block](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:92:0-112:1) with `TransactionExecutionResult[]` |
| **2. Block Metadata** | [BlockResultService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockResultService.ts:0:0-0:0) | ❌ No | Generates [BlockResult](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:128:0-136:1) (state root, merkle witnesses) |
| **3. Tracing** | `BatchTracingService.ts`, [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0), `TransactionTracingService.ts`, [StateTransitionTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/StateTransitionTracingService.ts:0:0-0:0) | ❌ No | Collects witnesses and prepares prover inputs. Uses `o1js` types but just for data construction, NOT in-circuit |
| **4. Flow Orchestration** | [BatchFlow.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/flow/BatchFlow.ts:0:0-0:0), `BlockFlow.ts`, `StateTransitionFlow.ts` | ❌ No | Orchestrates the proving tasks, manages parallelism |
| **5. PROVING TASKS** | `NewBlockTask.compute()`, `TransactionProvingTask.compute()`, `StateTransitionTask.compute()`, `RuntimeProvingTask.compute()` | ✅ **YES** | **This is where ZK proofs are actually generated!** Calls methods like `blockProver.proveBlock()`, `stateTransitionProver.prove*()` |

---

### Where Provable Code Actually Runs

The **provable (in-circuit)** code is in the `@proto-kit/protocol` package:

1. **[BlockProver](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:30:0-38:1)** - Proves block validity
   - `proveBlock()` 
   - `proveTransaction()`
   - `proveTransactions()`

2. **`StateTransitionProver`** - Proves state transition validity
   - Various prove methods for merkle tree updates

3. **`Runtime`** (from `@proto-kit/module`) - Proves runtime method execution
   - The actual user-defined runtime methods

These provers are **ZkPrograms** that run inside the provable context. The [compute()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/TransactionProvingTask.ts:92:2-126:3) method in tasks like [NewBlockTask](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:46:0-130:1) calls these prover methods:

```typescript
// NewBlockTask.compute() - Line 101-108
await this.blockProver.proveBlock(
  publicInput,
  networkState,
  blockWitness,
  input1,
  deferSTProof,
  afterBlockRootWitness,
  input2
);

// Then generate the actual proof
return await this.executionContext.current().result.prove<BlockProof>();
```

---

### Key Insight for Your Refactoring

The **sequencing** and **block storage** layers ([Block](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:92:0-112:1), [TransactionExecutionResult](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:23:0-34:1)) don't need provable types because:

1. They run **before** proving happens
2. The tracing services **convert** from storage types (Json) back to provable types when needed
3. The actual proving happens in **worker tasks** that receive serialized (Json) inputs and deserialize them to provable types

Your refactoring is correct - using Json types in `Block.transactions` and converting to provable types only in the tracing layer is the right approach!

### User Input

Okay. Now, as you've stated, there are provable code in non-provable part, namely in Sequencer and Tracer. I want to refactor them to be non-provable and convert to provable when they are only needed in Proving. 

Create a plan to do changes in steps. 

### Planner Response

# Refactoring Plan: Non-Provable Types in Sequencer & Tracing Layers

## Objective

Refactor the Sequencer and Tracing layers to use **non-provable (JSON-serializable) types** for data storage and intermediate processing, converting to **provable types only at the proving boundary** (when data enters the `*Task.compute()` methods).

---

## Current State Analysis

### Provable Types Used in Non-Provable Code

| Type | From | Used In | Impact |
|------|------|---------|--------|
| `Field` | `o1js` | State paths, hashes, commitments | High |
| `Bool` | `o1js` | Transaction status, flags | Medium |
| `UInt64` | `o1js` | Block heights, nonces | Medium |
| `Signature` | `o1js` | Transaction signatures | Medium |
| `PublicKey` | `o1js` | Sender addresses | Medium |
| `NetworkState` (Struct) | `@proto-kit/protocol` | Block network state | High |
| `PendingTransaction` (Class) | Sequencer | Mempool, execution | High - **Already done ✅** |
| [TransactionExecutionResult](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:23:0-34:1) | Sequencer | Block transactions | High - **Already done ✅** |
| `UntypedStateTransition` | Sequencer | State tracking | High - **Partially done** |

---

## Phased Refactoring Plan

### Phase 1: Complete Current Work (Block & Transaction Types) ✅
**Status: DONE**

- [x] [TransactionExecutionResultJson](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:41:0-52:1) interface
- [x] [StateTransitionBatchJson](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:36:0-39:1) interface  
- [x] [txResultToJson()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:54:0-70:1) converter
- [x] [txResultFromJson()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:72:0-88:1) converter
- [x] Update `Block.transactions` to use `TransactionExecutionResultJson[]`
- [x] Update [BlockProductionService](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:46:0-212:1) to convert on block creation
- [x] Update tracing services to convert back when needed

---

### Phase 2: Trackers & Block State Types
**Goal**: Remove `Field` usage from block production tracking structures

#### 2.1 `BlockTrackers` in `TransactionExecutionService.ts`

**Current:**
```typescript
export interface BlockTrackers {
  blockHashRoot: Field;
  eternalTransactionsList: TransactionHashList;
  transactionList: TransactionHashList;
  incomingMessages: MinaActionsHashList;
}
```

**Target:**
```typescript
export interface BlockTrackersJson {
  blockHashRoot: string;
  eternalTransactionsHash: string;
  transactionsHash: string;
  incomingMessagesHash: string;
}
```

**Files to change:**
- `TransactionExecutionService.ts`
- [BlockProductionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:0:0-0:0)

---

### Phase 3: Tracing Service Outputs
**Goal**: Make tracing service outputs JSON-serializable

#### 3.1 [TaskStateRecord](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:26:0-26:54) Type

**Current (in [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0)):**
```typescript
export type TaskStateRecord = Record<string, Field[]>;
```

**Target:**
```typescript
export type TaskStateRecordJson = Record<string, string[]>;
```

**Files to change:**
- [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0)
- `TransactionTracingService.ts`
- [NewBlockTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:0:0-0:0) (convert at boundary)

#### 3.2 [BlockTracingState](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:28:0-37:2) Type

**Current:**
```typescript
export type BlockTracingState = Pick<
  BlockProverState,
  | "witnessedRoots"
  | "stateRoot"
  | "pendingSTBatches"
  | "networkState"
  | "transactionList"
  | "eternalTransactionsList"
  | "incomingMessages"
>;
```

This uses provable hash lists. These are needed for the proving pipeline but could potentially be replaced with simpler commitment tracking.

**Recommendation:** Keep as-is for now, as it's tightly coupled to proving logic.

---

### Phase 4: Batch Trace Types
**Goal**: Make `BatchTrace` JSON-serializable for worker serialization

#### 4.1 `BatchTrace` in `BatchTracingService.ts`

**Current:**
```typescript
export interface BatchTrace {
  blocks: BlockTrace[];
  stateTransitionTrace: StateTransitionProofParameters[];
}
```

Where [BlockTrace](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:39:0-44:2) contains:
```typescript
export type BlockTrace = {
  blockParams: NewBlockProverParameters;
  transactions: TransactionTrace[];
  height: string;
};
```

And [NewBlockProverParameters](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:30:0-38:1) contains provable types like `NetworkState`, `Bool`, etc.

**Target:** Create `*Json` variants for serialization.

**Files to change:**
- `BatchTracingService.ts`
- [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0)
- Task serializers (already exist but could be simplified)

---

### Phase 5: Merkle Witness Types
**Goal**: Use JSON representations for merkle witnesses

#### 5.1 `LinkedMerkleTreeWitness`

**Current:** Uses `Field[]` internally

**Target:** Already has [toJSON()](cci:1://file:///Users/saitunc/Desktop/framework/packages/indexer/src/tasks/IndexBlockTaskParameters.ts:18:2-26:3)/[fromJSON()](cci:1://file:///Users/saitunc/Desktop/framework/packages/indexer/src/tasks/IndexBlockTaskParameters.ts:28:2-47:3) - ensure these are used consistently

**Files to check:**
- [StateTransitionTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/StateTransitionTracingService.ts:0:0-0:0)
- [StateTransitionTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/StateTransitionTask.ts:0:0-0:0)

---

### Phase 6: RuntimeProofParameters
**Goal**: Make runtime proving parameters JSON-serializable

#### 6.1 `RuntimeProofParameters` in `TransactionTracingService.ts`

**Current:**
```typescript
export interface RuntimeProofParameters {
  tx: PendingTransaction;
  networkState: NetworkState;
  state: TaskStateRecord;
}
```

**Target:**
```typescript
export interface RuntimeProofParametersJson {
  tx: PendingTransactionJSONType;
  networkState: NetworkStateJson;
  state: TaskStateRecordJson;
}
```

**Files to change:**
- `TransactionTracingService.ts`
- [RuntimeProvingTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/RuntimeProvingTask.ts:0:0-0:0) (convert at boundary)

---

## Implementation Order

```
Phase 2: BlockTrackers
    ↓
Phase 3: TaskStateRecord
    ↓
Phase 4: BatchTrace (depends on 2 & 3)
    ↓
Phase 5: Merkle Witnesses
    ↓
Phase 6: RuntimeProofParameters
```

---

## Detailed Steps for Each Phase

### Phase 2: BlockTrackers (Recommended Next Step)

| Step | File | Change |
|------|------|--------|
| 2.1.1 | `TransactionExecutionService.ts` | Create `BlockTrackersJson` interface |
| 2.1.2 | `TransactionExecutionService.ts` | Add `blockTrackersToJson()` helper |
| 2.1.3 | [BlockProductionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:0:0-0:0) | Use string hashes instead of `Field` for block state |
| 2.1.4 | [BlockProductionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:0:0-0:0) | Convert to `Field` only when calling protocol methods |

### Phase 3: TaskStateRecord

| Step | File | Change |
|------|------|--------|
| 3.1.1 | [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0) | Create `TaskStateRecordJson` type |
| 3.1.2 | `TransactionTracingService.ts` | Update `collectStartingState()` to return Json |
| 3.1.3 | [NewBlockTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:0:0-0:0) | Convert `TaskStateRecordJson` → [TaskStateRecord](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:26:0-26:54) in [compute()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/TransactionProvingTask.ts:92:2-126:3) |
| 3.1.4 | [TransactionProvingTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/TransactionProvingTask.ts:0:0-0:0) | Same conversion at boundary |

### Phase 4: BatchTrace

| Step | File | Change |
|------|------|--------|
| 4.1.1 | [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0) | Create `BlockTraceJson`, `NewBlockProverParametersJson` |
| 4.1.2 | `BatchTracingService.ts` | Create `BatchTraceJson` |
| 4.1.3 | [BatchFlow.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/flow/BatchFlow.ts:0:0-0:0) | Convert Json → Provable when pushing to tasks |
| 4.1.4 | Update task parameter serializers | Simplify (just JSON.stringify) |

---

## Files Summary

### High Priority (Phase 2-3)
1. `TransactionExecutionService.ts` - BlockTrackers
2. [BlockProductionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:0:0-0:0) - Uses BlockTrackers
3. [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0) - TaskStateRecord, BlockTrace
4. `TransactionTracingService.ts` - collectStartingState, RuntimeProofParameters

### Medium Priority (Phase 4-5)
5. `BatchTracingService.ts` - BatchTrace
6. [StateTransitionTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/StateTransitionTracingService.ts:0:0-0:0) - Merkle witnesses
7. [BatchFlow.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/flow/BatchFlow.ts:0:0-0:0) - Orchestration

### Proving Boundary (Update Converters)
8. [NewBlockTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:0:0-0:0) - Convert at compute()
9. [TransactionProvingTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/TransactionProvingTask.ts:0:0-0:0) - Convert at compute()
10. [RuntimeProvingTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/RuntimeProvingTask.ts:0:0-0:0) - Convert at compute()
11. [StateTransitionTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/StateTransitionTask.ts:0:0-0:0) - Convert at compute()

---

## Questions to Consider

1. **Do you want to proceed phase by phase, or tackle a specific area first?**

2. **Should we prioritize the tracing layer (which is more complex) or the simpler BlockTrackers first?**

3. **Are there any specific files you've noticed issues with that you'd like to prioritize?**

---

Would you like me to start implementing **Phase 2 (BlockTrackers)** or **Phase 3 (TaskStateRecord)** first?

### User Input

I have a concern, which you might solve. I will change types at so many steps, but mappers or task serializers are using the original types. When we do the change, do i expect to directly not use any mappers or task serializers ? 

### Planner Response

Excellent question! Let me clarify the relationship between types, mappers, and task serializers:

## The Two Serialization Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SEQUENCER PROCESS                           │
│                                                                     │
│  Domain Layer (your types)                                          │
│       ↓                                                             │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │  PERSISTENCE LAYER  │         │   WORKER DISPATCH   │           │
│  │  (Prisma/DB)        │         │   (IPC/Network)     │           │
│  │                     │         │                     │           │
│  │  Uses: Mappers      │         │  Uses: Serializers  │           │
│  └──────────┬──────────┘         └──────────┬──────────┘           │
└─────────────┼───────────────────────────────┼───────────────────────┘
              ↓                               ↓
         ┌─────────┐                   ┌─────────────┐
         │   DB    │                   │   WORKER    │
         │ (JSON)  │                   │  PROCESS    │
         └─────────┘                   └─────────────┘
```

---

## Current State vs Target State

### 1. Persistence Mappers

| Current | Target |
|---------|--------|
| Domain uses provable types (`Field`, `Bool`) | Domain uses Json types (`string`, `boolean`) |
| Mappers convert: `Field` → `string` | **No conversion needed** - just cast |
| Complex mapping logic | Simple `as unknown as Prisma.JsonArray` |

**Result: Mappers become trivial or can be removed**

You've already seen this with `Block.transactions`:
```typescript
// Before: Complex mapper converting Bool/Field to primitives
// After: Just a cast
transactions: input.transactions as unknown as Prisma.JsonArray
```

---

### 2. Task Serializers

This is more nuanced. Let me show you:

**Current Flow:**
```
Provable Types (Field, Bool, NetworkState)
    ↓ Custom Serializer (e.g., field.toString(), networkState.toJSON())
JSON String
    ↓ Send to worker
    ↓ Custom Deserializer (e.g., Field(str), NetworkState.fromJSON())
Provable Types → Used in proving
```

**Target Flow (with Json types):**
```
Json Types (string, boolean, NetworkStateJson)
    ↓ Simple JSON.stringify() 
JSON String
    ↓ Send to worker
    ↓ Simple JSON.parse()
Json Types
    ↓ Convert to Provable at boundary (new step!)
Provable Types → Used in proving
```

---

## The Key Insight

**Task Serializers don't disappear - they become SIMPLER, and the conversion moves to the compute() method.**

### Example: `NewBlockProvingParametersSerializer`

**Current (complex):**
```typescript
class NewBlockProvingParametersSerializer {
  toJSON(params: NewBlockProvingParameters): string {
    return JSON.stringify({
      publicInput: this.publicInputSerializer.toJSON(params.publicInput),
      networkState: NetworkState.toJSON(params.networkState),
      blockWitness: BlockHashMerkleTreeWitness.toJSON(params.blockWitness),
      deferSTProof: params.deferSTProof.toBoolean(),
      // ... lots of custom conversion
    });
  }
  
  fromJSON(json: string): NewBlockProvingParameters {
    const parsed = JSON.parse(json);
    return {
      publicInput: this.publicInputSerializer.fromJSON(parsed.publicInput),
      networkState: new NetworkState(NetworkState.fromJSON(parsed.networkState)),
      // ... lots of custom reconstruction
    };
  }
}
```

**Target (simple):**
```typescript
class NewBlockProvingParametersSerializer {
  // Types are already Json-compatible!
  toJSON(params: NewBlockProvingParametersJson): string {
    return JSON.stringify(params);
  }
  
  fromJSON(json: string): NewBlockProvingParametersJson {
    return JSON.parse(json);
  }
}
```

**But now the conversion happens in `NewBlockTask.compute()`:**
```typescript
class NewBlockTask {
  async compute(input: NewBlockProvingParametersJson): Promise<BlockProof> {
    // Convert at the proving boundary
    const provableParams = newBlockParamsFromJson(input);
    
    await this.blockProver.proveBlock(
      provableParams.publicInput,
      provableParams.networkState,
      // ...
    );
  }
}
```

---

## Summary: What Happens to Each

| Component | Current Role | After Refactoring |
|-----------|--------------|-------------------|
| **Persistence Mappers** | Convert provable ↔ DB types | **Trivial casts or removed** |
| **Task Serializers** | Custom JSON conversion with provable handling | **Simple JSON.stringify/parse** |
| **New Converters** | Don't exist | **`*FromJson()` functions at proving boundary** |

---

## The Trade-off

**Before:**
- Conversion complexity is in serializers
- Serializers handle provable → JSON → provable

**After:**
- Serializers are trivial (just JSON)
- Conversion is explicit at the proving boundary (`*FromJson()` functions)
- Clearer separation: _"data is JSON until it enters the prover"_

---

## Practical Impact

1. **You CAN remove/simplify mappers** for types that become fully JSON-compatible
2. **Serializers simplify** but don't completely disappear (you still need JSON.stringify/parse)  
3. **New converter functions** are needed at the proving boundary (like [txResultFromJson()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:72:0-88:1) you already have)

---

## Recommendation

For the refactoring plan, I suggest we:

1. **Keep serializers** but make them trivial (just `JSON.stringify`/`parse`)
2. **Add `*FromJson()` converters** for each type that needs to become provable
3. **Call converters in `*.compute()` methods** of tasks

This gives you:
- ✅ Simple serialization (JSON everywhere)
- ✅ Clean proving boundary (converters in one place)
- ✅ Easy persistence (no mappers needed)

Would you like me to proceed with Phase 2 using this approach?

### User Input

Cool. Add detailed implementation steps for this conversion as well.

### Planner Response

# Complete Refactoring Plan: Non-Provable Types with Serializer Simplification

---

## Phase 0: Serializer & Mapper Analysis (Pre-work)

### Current Serializers Inventory

| Serializer | Location | Serializes |
|------------|----------|------------|
| `NewBlockProvingParametersSerializer` | `tasks/serializers/` | [NewBlockProvingParameters](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:40:0-44:2) |
| `TransactionProvingTaskParameterSerializer` | `tasks/serializers/` | `TransactionProvingTaskParameters` |
| `StateTransitionProofParametersSerializer` | `tasks/serializers/` | `StateTransitionProofParameters` |
| `RuntimeProofParametersSerializer` | `tasks/serializers/` | `RuntimeProofParameters` |
| `BlockProofSerializer` | `tasks/serializers/` | [BlockProof](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:28:0-28:73) (proofs) |
| `ProofTaskSerializer` | `helpers/utils.ts` | Generic proof serializer |

### Current Mappers Inventory

| Mapper | Location | Maps |
|--------|----------|------|
| `BlockMapper` | `persistance/mappers/` | [Block](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:92:0-112:1) ↔ [PrismaBlock](cci:2://file:///Users/saitunc/Desktop/framework/packages/persistance/src/services/prisma/PrismaBlockStorage.ts:27:0-245:1) |
| `BlockResultMapper` | `persistance/mappers/` | [BlockResult](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:128:0-136:1) ↔ `PrismaBlockResult` |
| [TransactionExecutionResultMapper](cci:2://file:///Users/saitunc/Desktop/framework/packages/persistance/src/services/prisma/mappers/TransactionMapper.ts:47:0-91:1) | `persistance/mappers/` | [TransactionExecutionResult](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:23:0-34:1) ↔ DB |
| [TransactionMapper](cci:2://file:///Users/saitunc/Desktop/framework/packages/persistance/src/services/prisma/mappers/TransactionMapper.ts:16:0-45:1) | `persistance/mappers/` | `PendingTransaction` ↔ DB |
| `StateTransitionBatchArrayMapper` | `persistance/mappers/` | `StateTransitionBatch[]` ↔ DB |
| `EventArrayMapper` | `persistance/mappers/` | Events ↔ DB |

---

## Phase 1: Type Definitions (Already Done ✅)

- [x] [TransactionExecutionResultJson](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:41:0-52:1)
- [x] [StateTransitionBatchJson](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:36:0-39:1)
- [x] [txResultToJson()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:54:0-70:1) / [txResultFromJson()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:72:0-88:1)

---

## Phase 2: BlockTrackers & Block Production

### Step 2.1: Create `BlockTrackersJson` Type

**File:** [packages/sequencer/src/protocol/production/sequencing/TransactionExecutionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/TransactionExecutionService.ts:0:0-0:0)

```typescript
// NEW: JSON-compatible trackers
export interface BlockTrackersJson {
  blockHashRoot: string;
  eternalTransactionsHash: string;
  transactionsHash: string;
  incomingMessagesHash: string;
}

// Keep provable version for internal computation
export interface BlockTrackers {
  blockHashRoot: Field;
  eternalTransactionsList: TransactionHashList;
  transactionList: TransactionHashList;
  incomingMessages: MinaActionsHashList;
}

// Converter
export function blockTrackersToJson(trackers: BlockTrackers): BlockTrackersJson {
  return {
    blockHashRoot: trackers.blockHashRoot.toString(),
    eternalTransactionsHash: trackers.eternalTransactionsList.commitment.toString(),
    transactionsHash: trackers.transactionList.commitment.toString(),
    incomingMessagesHash: trackers.incomingMessages.commitment.toString(),
  };
}
```

### Step 2.2: Update [BlockProductionService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/sequencing/BlockProductionService.ts:0:0-0:0)

Keep using provable `BlockTrackers` internally (needed for hash list operations), but extract JSON values for the [Block](cci:2://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/storage/model/Block.ts:92:0-112:1) object.

**No change needed** - already uses `FieldString()` for Block fields.

---

## Phase 3: TaskStateRecord

### Step 3.1: Create `TaskStateRecordJson` Type

**File:** [packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0)

```typescript
// Current (provable)
export type TaskStateRecord = Record<string, Field[]>;

// NEW (JSON-compatible)
export type TaskStateRecordJson = Record<string, string[]>;

// Converters
export function taskStateRecordToJson(record: TaskStateRecord): TaskStateRecordJson {
  return Object.fromEntries(
    Object.entries(record).map(([key, fields]) => [
      key,
      fields.map(f => f.toString())
    ])
  );
}

export function taskStateRecordFromJson(json: TaskStateRecordJson): TaskStateRecord {
  return Object.fromEntries(
    Object.entries(json).map(([key, strings]) => [
      key,
      strings.map(s => Field(s))
    ])
  );
}
```

### Step 3.2: Update `collectStartingState()` in `TransactionTracingService.ts`

**Current:**
```typescript
export function collectStartingState(
  stateTransitions: UntypedStateTransition[]
): TaskStateRecord {
  // Returns Record<string, Field[]>
}
```

**Target:**
```typescript
export function collectStartingState(
  stateTransitions: UntypedStateTransition[]
): TaskStateRecordJson {
  const stateEntries = stateTransitions
    .filter(...)
    .filter(...)
    .map((st) => [st.path.toString(), st.fromValue.value.map(f => f.toString())]);
  return Object.fromEntries(stateEntries);
}
```

### Step 3.3: Update Task Compute Methods

**Files:**
- [NewBlockTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:0:0-0:0)
- [TransactionProvingTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/TransactionProvingTask.ts:0:0-0:0)

**In [compute()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/TransactionProvingTask.ts:92:2-126:3) method:**
```typescript
// Convert at boundary
const startingStateBeforeHook = taskStateRecordFromJson(parameters.startingStateBeforeHook);
const startingStateAfterHook = taskStateRecordFromJson(parameters.startingStateAfterHook);

await executeWithPrefilledStateService(
  this.protocol.stateServiceProvider,
  [startingStateBeforeHook, startingStateAfterHook],
  async () => { /* ... */ }
);
```

---

## Phase 4: NewBlockProverParameters

### Step 4.1: Create JSON Interface

**File:** [packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/NewBlockTask.ts:0:0-0:0)

```typescript
// Current (provable)
export interface NewBlockProverParameters {
  publicInput: BlockProverPublicInput;
  networkState: NetworkState;
  blockWitness: BlockHashMerkleTreeWitness;
  deferSTProof: Bool;
  afterBlockRootWitness: WitnessedRootWitness;
  startingStateBeforeHook: TaskStateRecord;
  startingStateAfterHook: TaskStateRecord;
}

// NEW (JSON-compatible)
export interface NewBlockProverParametersJson {
  publicInput: BlockProverPublicInputJson;
  networkState: NetworkStateJson;
  blockWitness: BlockHashMerkleTreeWitnessJson;
  deferSTProof: boolean;
  afterBlockRootWitness: WitnessedRootWitnessJson;
  startingStateBeforeHook: TaskStateRecordJson;
  startingStateAfterHook: TaskStateRecordJson;
}

// Converters
export function newBlockParamsToJson(params: NewBlockProverParameters): NewBlockProverParametersJson {
  return {
    publicInput: BlockProverPublicInput.toJSON(params.publicInput),
    networkState: NetworkState.toJSON(params.networkState),
    blockWitness: BlockHashMerkleTreeWitness.toJSON(params.blockWitness),
    deferSTProof: params.deferSTProof.toBoolean(),
    afterBlockRootWitness: witnessedRootWitnessToJson(params.afterBlockRootWitness),
    startingStateBeforeHook: taskStateRecordToJson(params.startingStateBeforeHook),
    startingStateAfterHook: taskStateRecordToJson(params.startingStateAfterHook),
  };
}

export function newBlockParamsFromJson(json: NewBlockProverParametersJson): NewBlockProverParameters {
  return {
    publicInput: BlockProverPublicInput.fromJSON(json.publicInput),
    networkState: new NetworkState(NetworkState.fromJSON(json.networkState)),
    blockWitness: new BlockHashMerkleTreeWitness(
      BlockHashMerkleTreeWitness.fromJSON(json.blockWitness)
    ),
    deferSTProof: Bool(json.deferSTProof),
    afterBlockRootWitness: witnessedRootWitnessFromJson(json.afterBlockRootWitness),
    startingStateBeforeHook: taskStateRecordFromJson(json.startingStateBeforeHook),
    startingStateAfterHook: taskStateRecordFromJson(json.startingStateAfterHook),
  };
}
```

### Step 4.2: Update [BlockTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:0:0-0:0)

Change [traceBlock()](cci:1://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/BlockTracingService.ts:57:2-162:3) to return JSON types:

**Current:**
```typescript
public async traceBlock(...): Promise<[BlockTracingState, BlockTrace]> {
  // Returns BlockTrace with provable NewBlockProverParameters
}
```

**Target:**
```typescript
public async traceBlock(...): Promise<[BlockTracingState, BlockTraceJson]> {
  // Returns BlockTraceJson with NewBlockProverParametersJson
}

export interface BlockTraceJson {
  blockParams: NewBlockProverParametersJson;
  transactions: TransactionTraceJson[];
  height: string;
}
```

---

## Phase 5: Simplify Serializers

### Step 5.1: Simplify `NewBlockProvingParametersSerializer`

**File:** [packages/sequencer/src/protocol/production/tasks/serializers/NewBlockProvingParametersSerializer.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/serializers/NewBlockProvingParametersSerializer.ts:0:0-0:0)

**Current (complex):**
```typescript
export class NewBlockProvingParametersSerializer {
  constructor(
    private readonly stProofSerializer: ProofTaskSerializer<...>,
    private readonly blockProofSerializer: ProofTaskSerializer<...>
  ) {}

  toJSON(input: NewBlockProvingParameters): string {
    // Complex conversion of each field
  }

  fromJSON(json: string): NewBlockProvingParameters {
    // Complex reconstruction of each field
  }
}
```

**Target (simple):**
```typescript
export class NewBlockProvingParametersSerializer 
  implements TaskSerializer<NewBlockProvingParametersJson> {
  
  // Proofs still need special handling (they contain actual proof data)
  constructor(
    private readonly stProofSerializer: ProofTaskSerializer<...>,
    private readonly blockProofSerializer: ProofTaskSerializer<...>
  ) {}

  toJSON(input: NewBlockProvingParametersJson): string {
    return JSON.stringify({
      params: input.params,  // Already JSON-compatible!
      input1: this.stProofSerializer.toJSON(input.input1),
      input2: this.blockProofSerializer.toJSON(input.input2),
    });
  }

  fromJSON(json: string): NewBlockProvingParametersJson {
    const parsed = JSON.parse(json);
    return {
      params: parsed.params,  // Already correct type
      input1: this.stProofSerializer.fromJSON(parsed.input1),
      input2: this.blockProofSerializer.fromJSON(parsed.input2),
    };
  }
}
```

> **Note:** Proof objects (`input1`, `input2`) still need special serialization because they contain cryptographic proof data. The simplification is for the parameters, not the proofs.

### Step 5.2: Repeat for Other Serializers

Apply the same pattern to:

| Serializer | Params become JSON | Proofs stay special |
|------------|-------------------|---------------------|
| `TransactionProvingTaskParameterSerializer` | `TransactionProverParameters` → JSON | `DynamicRuntimeProof` stays |
| `RuntimeProofParametersSerializer` | `RuntimeProofParameters` → JSON | N/A (no proofs) |
| `StateTransitionProofParametersSerializer` | `StateTransitionProofParameters` → JSON | Merkle witnesses already JSON |

---

## Phase 6: Simplify Persistence Mappers

### Step 6.1: [TransactionExecutionResultMapper](cci:2://file:///Users/saitunc/Desktop/framework/packages/persistance/src/services/prisma/mappers/TransactionMapper.ts:47:0-91:1)

**File:** [packages/persistance/src/services/prisma/mappers/TransactionMapper.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/persistance/src/services/prisma/mappers/TransactionMapper.ts:0:0-0:0)

**Current (maps provable types):**
```typescript
export class TransactionExecutionResultMapper {
  mapIn(input: [DBTransactionExecutionResult, DBTransaction]): TransactionExecutionResult {
    return {
      tx: this.transactionMapper.mapIn(input[1]),
      status: Bool(executionResult.status),
      hooksStatus: Bool(executionResult.hooksStatus),
      // ...
    };
  }

  mapOut(input: TransactionExecutionResult): [...] {
    return {
      status: input.status.toBoolean(),
      hooksStatus: input.hooksStatus.toBoolean(),
      // ...
    };
  }
}
```

**Target (trivial - types already match):**
```typescript
export class TransactionExecutionResultMapper {
  // Now Block.transactions is TransactionExecutionResultJson[]
  // DB stores JSON - types are already compatible!
  
  mapIn(input: [DBTransactionExecutionResult, DBTransaction]): TransactionExecutionResultJson {
    // Just restructure, no type conversion
    return {
      tx: {
        hash: input[1].hash,
        methodId: input[1].methodId,
        // ... all already strings
      },
      status: input[0].status,  // Already boolean in DB
      hooksStatus: input[0].hooksStatus,
      // ...
    };
  }

  mapOut(input: TransactionExecutionResultJson): [...] {
    // No conversion needed - types match
    return [
      {
        status: input.status,
        hooksStatus: input.hooksStatus,
        stateTransitions: input.stateTransitions as Prisma.JsonArray,
        events: input.events as Prisma.JsonArray,
        // ...
      },
      {
        hash: input.tx.hash,
        methodId: input.tx.methodId,
        // ...
      }
    ];
  }
}
```

### Step 6.2: `BlockMapper`

**Already largely simplified** - just needs `transactions` to be cast:

```typescript
mapIn(input: PrismaBlock): Block {
  return {
    // ...
    transactions: input.transactions as unknown as TransactionExecutionResultJson[],
    // ...
  };
}

mapOut(input: Block): PrismaBlock {
  return {
    // ...
    transactions: input.transactions as unknown as Prisma.JsonArray,
    // ...
  };
}
```

---

## Phase 7: RuntimeProofParameters

### Step 7.1: Create JSON Interface

**File:** [packages/sequencer/src/protocol/production/tracing/TransactionTracingService.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tracing/TransactionTracingService.ts:0:0-0:0)

```typescript
// Current
export interface RuntimeProofParameters {
  tx: PendingTransaction;
  networkState: NetworkState;
  state: TaskStateRecord;
}

// NEW
export interface RuntimeProofParametersJson {
  tx: PendingTransactionJSONType;
  networkState: NetworkStateJson;
  state: TaskStateRecordJson;
}

// Converters
export function runtimeParamsToJson(params: RuntimeProofParameters): RuntimeProofParametersJson {
  return {
    tx: params.tx.toJSON(),
    networkState: NetworkState.toJSON(params.networkState),
    state: taskStateRecordToJson(params.state),
  };
}

export function runtimeParamsFromJson(json: RuntimeProofParametersJson): RuntimeProofParameters {
  return {
    tx: PendingTransaction.fromJSON(json.tx),
    networkState: new NetworkState(NetworkState.fromJSON(json.networkState)),
    state: taskStateRecordFromJson(json.state),
  };
}
```

### Step 7.2: Update [RuntimeProvingTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/RuntimeProvingTask.ts:0:0-0:0)

```typescript
class RuntimeProvingTask {
  // Input type changes to JSON
  async compute(input: RuntimeProofParametersJson): Promise<RuntimeProof> {
    // Convert at boundary
    const params = runtimeParamsFromJson(input);
    
    // Use provable types for proving
    await this.runtime.prove(params.tx, params.networkState, params.state);
    
    return await this.executionContext.current().result.prove<RuntimeProof>();
  }
}
```

---

## Phase 8: StateTransitionProofParameters

### Step 8.1: Create JSON Interface

**File:** [packages/sequencer/src/protocol/production/tasks/StateTransitionTask.ts](cci:7://file:///Users/saitunc/Desktop/framework/packages/sequencer/src/protocol/production/tasks/StateTransitionTask.ts:0:0-0:0)

```typescript
// Current
export interface StateTransitionProofParameters {
  batch: StateTransitionProvableBatch;
  merkleWitnesses: LinkedMerkleTreeWitness[];
  publicInput: StateTransitionProverPublicInput;
  batchState: AppliedStateTransitionBatchState;
  witnessRoots: { values: Bool[] };
}

// NEW
export interface StateTransitionProofParametersJson {
  batch: StateTransitionProvableBatchJson;  // Need to define this
  merkleWitnesses: LinkedMerkleTreeWitnessJson[];
  publicInput: StateTransitionProverPublicInputJson;
  batchState: AppliedStateTransitionBatchStateJson;
  witnessRoots: { values: boolean[] };
}
```

> This is more complex because `StateTransitionProvableBatch` is a deeply nested provable structure. May need to defer this or create comprehensive converters.

---

## Implementation Order Summary

```
Week 1: Foundation
├── Phase 2: BlockTrackers (if needed)
├── Phase 3: TaskStateRecord
│   └── Step 3.1: Types
│   └── Step 3.2: collectStartingState()
│   └── Step 3.3: Update Task compute()
│
Week 2: Parameters
├── Phase 4: NewBlockProverParameters
│   └── Step 4.1: JSON types + converters
│   └── Step 4.2: Update BlockTracingService
│
├── Phase 7: RuntimeProofParameters
│   └── Step 7.1: JSON types + converters
│   └── Step 7.2: Update RuntimeProvingTask
│
Week 3: Serializers & Mappers
├── Phase 5: Simplify Serializers
│   └── Step 5.1: NewBlockProvingParametersSerializer
│   └── Step 5.2: Other serializers
│
├── Phase 6: Simplify Mappers
│   └── Step 6.1: TransactionExecutionResultMapper
│   └── Step 6.2: BlockMapper
│
Week 4: Complex Types (Optional)
└── Phase 8: StateTransitionProofParameters
    └── Complex nested structures
```

---

## Verification Checklist

After each phase, verify:

- [ ] `npm run build` passes in sequencer package
- [ ] `npm run build` passes in persistance package
- [ ] `npm run build` passes at repo root
- [ ] Existing tests still pass
- [ ] No runtime type errors (if possible to test)

---

Would you like me to start implementing Phase 3 (TaskStateRecord) as the next concrete step?