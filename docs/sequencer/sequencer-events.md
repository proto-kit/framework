# Sequencer events

Following events are available for each module:

All BlockTriggers:
- `block-produced: Block`
- `block-metadata-produced: BlockWithResult`
- `batch-produced: Batch`

TimedBlockTrigger:
- `tick: number`: Number of milliseconds that passed since start of sequencer

All Mempools:
- `mempool-transaction-added: PendingTransaction`
