/** Coarse stages an export moves through, for progress reporting. */
export type ExportProgress =
  | { stage: "reading" }
  | { stage: "attachments"; completed: number; total: number }
  | { stage: "writing" }
  /** Emitted once per conversation when several are exported in one run. */
  | { stage: "conversation"; completed: number; total: number; title: string };

export type ProgressReporter = (progress: ExportProgress) => void;
