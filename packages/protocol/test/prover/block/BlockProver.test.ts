/* eslint-disable max-len */
/**
 * Testing strategy:
 *
 * - Test that hooks are executed and batches are created correctly
 *    - Transaction
 *    - Block
 * - Test the various static checks on the transaction (signature, verificationKey, network state hash)
 * - Test correct construction of the batch and list commitments
 * - Test correct integration of the STProof - both defer and notDefer
 * - proveBlock: correct blockNumber progression, closed flag (doesn't accepts closed proofs as tx proofs)
 */

/* eslint-enable max-len */
