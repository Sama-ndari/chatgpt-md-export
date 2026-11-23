import * as vscode from "vscode";
import { parseJwtPayload } from "@chatgpt-md-export/core";

const MS_PER_DAY = 86_400_000;

export type TokenStatusKind = "missing" | "valid" | "expired" | "unreadable";

export interface TokenStatus {
  kind: TokenStatusKind;
  /** One line for the panel, already translated. */
  label: string;
  expiresAt?: Date;
}

/**
 * Read the expiry out of the stored token without calling ChatGPT. A bearer
 * token is a JWT, so the panel can say it went stale before the user spends a
 * minute wondering why an export failed.
 */
export function describeToken(token: string | undefined, now = Date.now()): TokenStatus {
  if (!token) {
    return { kind: "missing", label: vscode.l10n.t("No token. Link mode is unavailable.") };
  }

  const expiresAt = expiryOf(token);
  if (!expiresAt) {
    return {
      kind: "unreadable",
      label: vscode.l10n.t("Token saved, but its expiry could not be read.")
    };
  }

  const days = Math.round(Math.abs(expiresAt.getTime() - now) / MS_PER_DAY);
  if (expiresAt.getTime() <= now) {
    return {
      kind: "expired",
      expiresAt,
      label: vscode.l10n.t("Token expired {0} day(s) ago. Link mode will fail.", String(days))
    };
  }

  return {
    kind: "valid",
    expiresAt,
    label: vscode.l10n.t("Token valid for {0} more day(s)", String(days))
  };
}

function expiryOf(token: string): Date | undefined {
  try {
    const payload = parseJwtPayload(token);
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000) : undefined;
  } catch {
    return undefined;
  }
}
