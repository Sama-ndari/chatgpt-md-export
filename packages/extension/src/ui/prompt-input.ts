import * as vscode from "vscode";

export interface PromptButton {
  /** Codicon id, for example "question" or "close". */
  icon: string;
  tooltip: string;
  /** Omit to make the button cancel the prompt. */
  run?: () => void | Promise<void>;
}

export interface PromptOptions {
  title: string;
  prompt: string;
  placeholder?: string;
  value?: string;
  password?: boolean;
  buttons?: PromptButton[];
  validate: (value: string) => string | undefined;
}

interface BoundButton extends vscode.QuickInputButton {
  action?: PromptButton["run"];
}

/**
 * An input box with title-bar buttons. `showInputBox` cannot carry them, so
 * every prompt in the extension goes through the QuickInput API instead.
 */
export function promptInput(options: PromptOptions): Promise<string | undefined> {
  const input = vscode.window.createInputBox();
  input.title = options.title;
  input.prompt = options.prompt;
  input.placeholder = options.placeholder;
  input.value = options.value ?? "";
  input.password = options.password ?? false;
  input.ignoreFocusOut = true;
  input.buttons = (options.buttons ?? []).map(toQuickInputButton);

  return new Promise<string | undefined>((resolve) => {
    bindEvents(input, options.validate, resolve);
    input.show();
  }).finally(() => {
    input.dispose();
  });
}

function toQuickInputButton(button: PromptButton): BoundButton {
  return {
    iconPath: new vscode.ThemeIcon(button.icon),
    tooltip: button.tooltip,
    action: button.run
  };
}

function bindEvents(
  input: vscode.InputBox,
  validate: PromptOptions["validate"],
  resolve: (value: string | undefined) => void
): void {
  input.onDidTriggerButton((button: BoundButton) => {
    if (!button.action) {
      input.hide();
      return;
    }
    void button.action();
  });
  input.onDidChangeValue((value) => {
    input.validationMessage = value ? (validate(value) ?? "") : "";
  });
  input.onDidAccept(() => {
    const message = validate(input.value);
    if (message) {
      input.validationMessage = message;
      return;
    }
    resolve(input.value.trim());
    input.hide();
  });
  input.onDidHide(() => {
    resolve(undefined);
  });
}

/** The cancel button shown on every prompt, next to Escape. */
export function closeButton(): PromptButton {
  return { icon: "close", tooltip: vscode.l10n.t("Cancel") };
}

export function helpButton(open: () => Promise<void>): PromptButton {
  return { icon: "question", tooltip: vscode.l10n.t("Open the help page"), run: open };
}
