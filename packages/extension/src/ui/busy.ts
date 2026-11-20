import * as vscode from "vscode";

export interface BusyState {
  active: boolean;
  message?: string;
}

const emitter = new vscode.EventEmitter<BusyState>();

/** Lets any command drive the panel's busy strip without holding the view. */
export const onBusyChanged = emitter.event;

export function setBusy(state: BusyState): void {
  emitter.fire(state);
}

export function disposeBusy(): void {
  emitter.dispose();
}
