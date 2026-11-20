import * as vscode from "vscode";

const TOKEN_KEY = "chatgptMdExport.bearerToken";

/** Bearer token storage backed by the OS keychain through SecretStorage. */
export class TokenStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async read(): Promise<string | undefined> {
    const token = await this.secrets.get(TOKEN_KEY);
    return token?.trim() || undefined;
  }

  async write(token: string): Promise<void> {
    await this.secrets.store(TOKEN_KEY, token.trim());
  }

  async clear(): Promise<void> {
    await this.secrets.delete(TOKEN_KEY);
  }
}
