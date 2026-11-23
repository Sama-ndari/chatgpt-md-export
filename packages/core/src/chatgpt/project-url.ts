import { AppError } from "../shared/errors.js";
import { extractProjectId } from "./url-parser.js";

/**
 * Pull the project id out of whatever the user pasted: the project landing
 * page, any conversation inside the project, or the bare id. Only the id
 * matters to the listing endpoint, so the rest of the URL is ignored.
 */
export function parseProjectId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError("UNSUPPORTED_URL", "Paste a ChatGPT project link.");
  }

  const direct = extractProjectId(trimmed);
  if (direct) return direct;

  const fromUrl = projectIdFromUrl(trimmed);
  if (fromUrl) return fromUrl;

  throw new AppError(
    "UNSUPPORTED_URL",
    `No project id in "${trimmed}". A project link looks like https://chatgpt.com/g/g-p-<id>/project.`
  );
}

function projectIdFromUrl(value: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[0] === "g" ? segments[1] : undefined;
  return slug ? extractProjectId(slug) : undefined;
}
