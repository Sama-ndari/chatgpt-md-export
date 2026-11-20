/** Coarse stages an export moves through, for progress reporting. */
export type ExportProgress =
  | { stage: "reading" }
  | { stage: "attachments"; completed: number; total: number }
  | { stage: "writing" };

export type ProgressReporter = (progress: ExportProgress) => void;
