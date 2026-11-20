import type { ArchiveConversationSummary, ConversationExportResult } from "@chatgpt-md-export/core";
import { formatDate } from "@chatgpt-md-export/core";
import { cliBanner } from "./package-meta.js";

/** Human-readable success report written to stdout. */
export function formatExportReport(result: ConversationExportResult): string {
  const files =
    `${result.downloadedFiles} downloaded` +
    (result.failedFiles ? `, ${result.failedFiles} unavailable` : "");

  return [
    cliBanner(),
    `Exported: ${result.title}`,
    `Author:   ${result.author}`,
    `Messages: ${result.messageCount}`,
    `Markdown: ${result.markdownPath}`,
    `HTML:     ${result.htmlPath}`,
    `Files:    ${files}`,
    `Folder:   ${result.outputDir}`,
    ""
  ].join("\n");
}

/** Table-ish listing for `--archive --list`. */
export function formatArchiveListing(summaries: ArchiveConversationSummary[]): string {
  const rows = summaries.map((summary) => {
    const updated = formatDate(summary.updateTime ?? summary.createTime)?.slice(0, 10) ?? "unknown";
    return `${updated}  ${summary.id}  ${summary.title}`;
  });

  return [
    cliBanner(),
    `${summaries.length} conversation${summaries.length === 1 ? "" : "s"} in archive`,
    "",
    ...rows,
    ""
  ].join("\n");
}
