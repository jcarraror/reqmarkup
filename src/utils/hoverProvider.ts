// src/utils/hoverProvider.ts

import * as vscode from 'vscode';
import { findAnnotationsAtPosition } from './annotations';

export function registerHoverProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('*', {
            provideHover(document, position, token) {
                const annotations = findAnnotationsAtPosition(document.uri.fsPath, position);
                if (annotations.length > 0) {
                    // Combine texts of all annotations
                    const hoverTexts = annotations.map(annotation => {
                        let hoverText = `**Requirement:** ${annotation.text}`;
                        if (annotation.url) {
                            hoverText += `\n\n[View Requirement](${annotation.url})`;
                        }
                        return hoverText;
                    });
                    return new vscode.Hover(hoverTexts.join('\n\n'));
                }
                return undefined;
            }
        })
    );
}
