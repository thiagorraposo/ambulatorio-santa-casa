import { AsyncLocalStorage } from 'node:async_hooks';
import type { Transaction } from './database.service';

/** Only the single actor-attributed clinical transaction consumes this scope. */
export interface ClinicalOperationContext {
  actorId: string;
  transactionStarted: boolean;
  before(transaction: Transaction): Promise<void>;
  after(transaction: Transaction, result: unknown): Promise<void>;
}

export const clinicalOperationContext = new AsyncLocalStorage<ClinicalOperationContext>();
