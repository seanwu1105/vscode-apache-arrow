import type { ExtensionContext } from "vscode";
import { TableEditorProvider } from "./tableEditor";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(TableEditorProvider.register());
}
