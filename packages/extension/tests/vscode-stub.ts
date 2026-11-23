/**
 * Minimal stand-in for the `vscode` module, which only exists inside a running
 * editor. Vitest aliases "vscode" here so the extension's pure logic can be
 * tested without launching VS Code.
 */

export interface StubWorkspaceFolder {
  uri: { fsPath: string };
}

type Settings = Record<string, unknown>;

const state: { settings: Settings; folders: StubWorkspaceFolder[] | undefined } = {
  settings: {},
  folders: undefined
};

/** Point the stub at a set of settings and workspace folders for one test. */
export function configureStub(input: {
  settings?: Settings;
  workspaceFolders?: string[];
}): void {
  state.settings = input.settings ?? {};
  state.folders = input.workspaceFolders?.map((fsPath) => ({ uri: { fsPath } }));
}

export function resetStub(): void {
  state.settings = {};
  state.folders = undefined;
}

export const workspace = {
  getConfiguration(section: string) {
    return {
      get<T>(key: string): T | undefined {
        return state.settings[`${section}.${key}`] as T | undefined;
      }
    };
  },
  get workspaceFolders(): StubWorkspaceFolder[] | undefined {
    return state.folders;
  }
};

/** In-memory Memento, the shape ExportHistory stores its records in. */
export class StubMemento {
  private readonly values = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  update(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return [...this.values.keys()];
  }
}

export const l10n = {
  t(message: string, ...args: string[]): string {
    return message.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
  }
};
