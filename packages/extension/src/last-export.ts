import * as vscode from "vscode";

const STATE_KEY = "chatgptMdExport.lastExport";

export interface LastExport {
  outputDir: string;
  htmlPath: string;
  markdownPath: string;
  title: string;
}

/** Remembers the latest export so Preview works across window reloads. */
export class LastExportStore {
  constructor(private readonly state: vscode.Memento) {}

  read(): LastExport | undefined {
    return this.state.get<LastExport>(STATE_KEY);
  }

  async write(value: LastExport): Promise<void> {
    await this.state.update(STATE_KEY, value);
  }
}
