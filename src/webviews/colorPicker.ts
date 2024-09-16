// src/webviews/colorPicker.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { getWebviewContent } from './colorPickerContent';

export async function promptForColor(context: vscode.ExtensionContext, defaultColor?: string): Promise<string | undefined> {
    return new Promise((resolve) => {
        const panel = vscode.window.createWebviewPanel(
            'colorPicker',
            'Select Highlight Color',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'webviews'))]
            }
        );

        // Set the webview's HTML content
        panel.webview.html = getWebviewContent(panel.webview, context.extensionPath, defaultColor || '#000000');

        // Receive messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'colorSelected':
                        resolve(message.color);
                        panel.dispose();
                        break;
                    case 'cancel':
                        resolve(undefined);
                        panel.dispose();
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Handle the panel being disposed
        panel.onDidDispose(
            () => {
                resolve(undefined);
            },
            null,
            context.subscriptions
        );
    });
}
