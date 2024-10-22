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

  async openCustomDocument(uri: Uri, openContext: CustomDocumentOpenContext) {
    return (
      await TableDocument.create({ uri, backupId: openContext.backupId })
    ).unwrap();
  }

  resolveCustomEditor(
    document: TableDocument,
    webviewPanel: WebviewPanel,
  ): Thenable<void> | void {
    webviewPanel.webview.html = getHtmlForWebview({
      webview: webviewPanel.webview,
      stringifiedTable: document.stringifiedTable,
    });
  }
}

function getHtmlForWebview({
  webview,
  stringifiedTable: stringifiedTableSchema,
}: {
  readonly webview: Webview;
  readonly stringifiedTable: string;
}): string {
  const nonce = getNonce();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">

      <!--
      Use a content security policy to only allow loading images from https or
      from our extension directory, and only allow scripts that have a specific
      nonce.
      -->
      <meta
        http-equiv="Content-Security-Policy"
        content="
          default-src 'none';
          img-src ${webview.cspSource} blob:;
          style-src ${webview.cspSource};
          script-src 'nonce-${nonce}';
        "
      >

      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <title>Apache Arrow</title>
    </head>
    <body>
      <pre>
${stringifiedTableSchema}
      </pre>
    </body>
    </html>`;
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

class TableDocument extends Disposable implements CustomDocument {
  public static async create({
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

    const table = tableFromIPC(await workspace.fs.readFile(dataFile));

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

  get stringifiedTable() {
    return this.table.schema.toString();
  }

  override dispose() {
    super.dispose();
  }
}
