import type { DatabaseSync } from 'node:sqlite';
import type { AcquisitionInput } from '../src/lib/acquisition';
export function databasePath(): string;
export function openStore(path: string): DatabaseSync;
export function submitLocal(payload: Omit<AcquisitionInput, 'website'>, path?: string): 'received' | 'submission_mismatch' | 'rate_limited';
export function backupStore(path: string, destination: string): Promise<void>;
export function exportStore(path: string, destination: string): number;
