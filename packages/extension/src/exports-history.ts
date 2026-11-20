import * as vscode from "vscode";

const STATE_KEY = "chatgptMdExport.exports";
const MAX_ENTRIES = 15;

export interface ExportRecord {
  outputDir: string;
  htmlPath: string;
  markdownPath: string;
  title: string;
  messageCount: number;
  exportedAt: string;
}

/** Recent exports, newest first, so the sidebar survives a window reload. */
export class ExportHistory {
  constructor(private readonly state: vscode.Memento) {}

  list(): ExportRecord[] {
    return this.state.get<ExportRecord[]>(STATE_KEY) ?? [];
  }

  latest(): ExportRecord | undefined {
    return this.list()[0];
  }

  /** Adds a record, replacing any earlier export written to the same folder. */
  async add(record: ExportRecord): Promise<void> {
    const kept = this.list().filter((entry) => entry.outputDir !== record.outputDir);
    await this.state.update(STATE_KEY, [record, ...kept].slice(0, MAX_ENTRIES));
  }

  async remove(outputDir: string): Promise<void> {
    await this.state.update(
      STATE_KEY,
      this.list().filter((entry) => entry.outputDir !== outputDir)
    );
  }

  async clear(): Promise<void> {
    await this.state.update(STATE_KEY, []);
  }
}
