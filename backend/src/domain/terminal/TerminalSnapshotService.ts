import type { TerminalSnapshotPort } from '../../ports/terminal/TerminalSnapshotPort.js';
import type { TerminalSnapshot } from './TerminalSnapshotTypes.js';

export class TerminalSnapshotService {
  constructor(private snapshotPort: TerminalSnapshotPort) {}

  async getSnapshot(userId: string, instrument: string): Promise<TerminalSnapshot> {
    return this.snapshotPort.getSnapshot(userId, instrument);
  }
}
