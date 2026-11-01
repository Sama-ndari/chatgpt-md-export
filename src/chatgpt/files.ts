import { createApiHeaders, getTokenInfo } from "./auth.js";
import { AppError } from "../shared/errors.js";
import type { AttachmentKind } from "./types.js";

const API_BASE = "https://chatgpt.com/backend-api";

export interface FileClientOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

export interface ResolvedFileDownload {
  downloadUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

interface DownloadMetaResponse {
  status?: string;
  download_url?: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  error_code?: string;
  error_message?: string | null;
  detail?: string;
}

/**
 * Resolve a signed download URL for a ChatGPT file/asset pointer id.
 * Tries sediment conversation attachment first when needed, then files API variants.
 */
export async function resolveFileDownload(
  input: {
    fileId: string;
    kind: AttachmentKind;
    conversationId?: string;
  },
  options: FileClientOptions = {}
): Promise<ResolvedFileDownload> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const tokenInfo = getTokenInfo(env);
  const headers = createApiHeaders(tokenInfo.token, tokenInfo.account_id);
  const endpoints = buildDownloadEndpoints(input.fileId, input.kind, input.conversationId);

  let lastError: AppError | undefined;
  for (const endpoint of endpoints) {
    try {
      const response = await fetchImpl(endpoint, { headers });
      const authError = await authFailureFromResponse(response, input.fileId);
      if (authError) {
        // Owner mismatch will fail on every endpoint — stop early.
        if (authError.error_code === "FILE_OWNER_MISMATCH") throw authError;
        lastError = authError;
        continue;
      }
      if (response.status === 404) {
        lastError = new AppError(
          "FILE_DOWNLOAD_FAILED",
          `File ${input.fileId} was not found at ${endpoint}.`
        );
        continue;
      }
      if (!response.ok) {
        lastError = new AppError(
          "FILE_DOWNLOAD_FAILED",
          `File download metadata failed (${response.status} ${response.statusText}).`
        );
        continue;
      }

      const payload = (await response.json()) as DownloadMetaResponse;
      if (payload.status === "error" || !payload.download_url) {
        lastError = new AppError(
          "FILE_DOWNLOAD_FAILED",
          payload.error_message || `No download_url for file ${input.fileId}.`
        );
        continue;
      }

      return {
        downloadUrl: payload.download_url,
        fileName: payload.file_name ?? undefined,
        mimeType: payload.mime_type ?? undefined,
        sizeBytes: payload.file_size_bytes ?? undefined
      };
    } catch (error) {
      if (error instanceof AppError && error.error_code === "FILE_OWNER_MISMATCH") throw error;
      lastError =
        error instanceof AppError
          ? error
          : new AppError(
              "FILE_DOWNLOAD_FAILED",
              `File download failed for ${input.fileId}: ${error instanceof Error ? error.message : String(error)}`
            );
    }
  }

  throw (
    lastError ??
    new AppError("FILE_DOWNLOAD_FAILED", `Unable to resolve download URL for file ${input.fileId}.`)
  );
}

/** Download file bytes from a signed URL (no ChatGPT auth required on the signed URL). */
export async function downloadFileBytes(
  downloadUrl: string,
  options: FileClientOptions = {}
): Promise<{ bytes: Buffer; contentType?: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(downloadUrl);
  if (!response.ok) {
    throw new AppError(
      "FILE_DOWNLOAD_FAILED",
      `Signed download failed (${response.status} ${response.statusText}).`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") ?? undefined
  };
}

async function authFailureFromResponse(
  response: Response,
  fileId: string
): Promise<AppError | undefined> {
  if (response.status !== 401 && response.status !== 403) return undefined;
  const detail = await readErrorDetail(response);
  if (detail.includes("user_mismatch")) {
    return new AppError(
      "FILE_OWNER_MISMATCH",
      `File ${fileId} belongs to another ChatGPT account (user_mismatch).`,
      { recoverable: true }
    );
  }
  return new AppError(
    "FILE_DOWNLOAD_FAILED",
    `ChatGPT rejected file download (${response.status}${detail ? `: ${detail}` : ""}).`
  );
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    if (!text) return "";
    try {
      const json = JSON.parse(text) as { detail?: unknown; error_message?: unknown };
      if (typeof json.detail === "string") return json.detail;
      if (typeof json.error_message === "string") return json.error_message;
    } catch {
      // plain text body
    }
    return text.slice(0, 180);
  } catch {
    return "";
  }
}

function buildDownloadEndpoints(
  fileId: string,
  kind: AttachmentKind,
  conversationId?: string
): string[] {
  const encoded = encodeURIComponent(fileId);
  const endpoints: string[] = [];

  if (kind === "sediment" && conversationId) {
    endpoints.push(`${API_BASE}/conversation/${encodeURIComponent(conversationId)}/attachment/${encoded}/download`);
  }

  endpoints.push(`${API_BASE}/files/download/${encoded}`);
  endpoints.push(`${API_BASE}/files/${encoded}/download`);

  if (conversationId) {
    const conv = encodeURIComponent(conversationId);
    endpoints.push(`${API_BASE}/files/download/${encoded}?conversation_id=${conv}&inline=false`);
    if (kind !== "sediment") {
      endpoints.push(`${API_BASE}/conversation/${conv}/attachment/${encoded}/download`);
    }
  }

  return endpoints;
}
