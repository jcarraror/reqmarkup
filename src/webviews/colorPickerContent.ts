// src/webviews/colorPickerContent.ts
import * as vscode from 'vscode';
import * as path from 'path';

//Cursed code below
export function getWebviewContent(webview: vscode.Webview, extensionPath: string, defaultColor: string): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'src', 'webviews', 'colorPicker.js')));

    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
     <style>
		body {
		  font-family: sans-serif;
		  margin: 0;
		  padding: 10px;
		}
		.container {
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		}
		#colorPicker {
		  width: 100%;
		  height: 150px;
		}
		#colorValue {
		  margin-top: 10px;
		  font-size: 16px;
		}
		#buttons {
		  margin-top: 20px;
		}
		button {
		  margin: 0 5px;
		  padding: 5px 10px;
		  font-size: 14px;
		}
	  </style>
  </head>
  <body>
    <div class="container">
      <input type="color" id="colorPicker" value="${defaultColor}">
      <div id="colorValue">${defaultColor}</div>
      <div id="buttons">
        <button id="selectButton">Select</button>
        <button id="cancelButton">Cancel</button>
      </div>
    </div>

    <script src="${scriptUri}"></script>
  </body>
  </html>
  `;
}
