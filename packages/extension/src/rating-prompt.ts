import * as vscode from "vscode";
import { REVIEW_URL } from "./links.js";

const STATE_KEY = "chatgptMdExport.ratingDismissed";
const EXPORTS_BEFORE_ASKING = 3;

/**
 * Asks for a Marketplace rating once the tool has proven useful, and never
 * again after the user dismisses it.
 */
export class RatingPrompt {
  constructor(private readonly state: vscode.Memento) {}

  shouldAsk(exportCount: number): boolean {
    if (this.state.get<boolean>(STATE_KEY)) return false;
    return exportCount >= EXPORTS_BEFORE_ASKING;
  }

  async dismiss(): Promise<void> {
    await this.state.update(STATE_KEY, true);
  }
}

/** Opens the Marketplace review form. */
export async function openReviewPage(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(REVIEW_URL));
}
