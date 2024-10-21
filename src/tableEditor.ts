import type { Table } from "apache-arrow";
import { tableFromIPC } from "apache-arrow";
import type {
  CustomDocument,
  CustomDocumentOpenContext,
  CustomReadonlyEditorProvider,
  Webview,
  WebviewPanel,
} from "vscode";
import { Disposable, Uri, window, workspace } from "vscode";
import { Err, Ok } from "./result";
import { getNonce } from "./utils";

export class TableEditorProvider implements CustomReadonlyEditorProvider {
  public static register(): Disposable {
    const provider = new TableEditorProvider();
    const providerRegistration = window.registerCustomEditorProvider(
      TableEditorProvider.viewType,
      provider,
    );
    return providerRegistration;
  }

  private static readonly viewType = "apacheArrow.arrow";

  openCustomDocument(
    uri: Uri,
    openContext: CustomDocumentOpenContext,
  ): CustomDocument | Thenable<CustomDocument> {
    return TableDocument.create({
      uri,
      backupId: openContext.backupId,
    }).unwrap();
  }

  resolveCustomEditor(
    document: CustomDocument,
    webviewPanel: WebviewPanel,
  ): Thenable<void> | void {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    webviewPanel.webview.onDidReceiveMessage((e) => {
      console.log(e);
    });
  }

  private getHtmlForWebview(webview: Webview): string {
    const nonce = getNonce();

    return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<title>My title here</title>
			</head>
			<body>
				<h1>Hello, world!</h1>
        <p>My custom content here</p>
        <button>Click me</button>
        <textarea></textarea>
        <pre>
          <code>
            console.log("Hello, world!");
          </code>
        </pre>
			</body>
			</html>`;
  }
}

class TableDocument extends Disposable implements CustomDocument {
  public static create({
    uri,
    backupId,
  }: {
    readonly uri: Uri;
    readonly backupId?: string;
  }) {
    let dataFile: Uri;
    try {
      dataFile = backupId === undefined ? uri : Uri.parse(backupId, true);
    } catch (error) {
      if (error instanceof Error) return Err(error);
      return Err(new Error(JSON.stringify(error)));
    }

    if (dataFile.scheme === "untitled")
      return Err(new Error("Untitled empty file is not supported."));

    const table = tableFromIPC(workspace.fs.readFile(dataFile));

    return Ok(new TableDocument(uri, table));
  }

  private constructor(
    readonly uri: Uri,
    readonly table: Table,
  ) {
    super(() => {
      this.dispose();
    });
  }

  override dispose() {
    super.dispose();
  }
}
