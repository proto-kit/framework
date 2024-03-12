# Sequencer events

Following events are available for each module:

All BlockTriggers:
- `block-produced: UnprovenBlock`
- `block-metadata-produced: UnprovenBlockWithMetadata`
- `batch-produced: ComputedBlock`

TimedBlockTrigger:
- `tick: number`: Number of milliseconds that passed since start of sequencer

All Mempools:
- `mempool-transaction-added: PendingTransaction`
