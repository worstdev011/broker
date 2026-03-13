import type { TerminalSnapshot } from '../../domain/terminal/TerminalSnapshotTypes.js';

export interface TerminalSnapshotPort {
  getSnapshot(userId: string, instrument: string): Promise<TerminalSnapshot>;
}
