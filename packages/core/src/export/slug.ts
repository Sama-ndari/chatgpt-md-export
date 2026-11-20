/** Build a filesystem-safe folder name from a conversation title. */
export function slugifyTitle(title: string, fallback = "conversation"): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

/** Make a filename safe for the local filesystem. */
export function sanitizeFileName(name: string, fallback = "file"): string {
  const cleaned = name
    // Control characters are rejected by Windows and NTFS, so they are stripped on purpose.
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}
