// src/utils/prompts.ts

import * as vscode from 'vscode';

export function promptForAnnotation(defaultText?: string): Thenable<string | undefined> {
    return vscode.window.showInputBox({
        prompt: 'Enter requirement specification for the selected code',
        value: defaultText || '',
        placeHolder: 'e.g., Implements feature X'
    });
}

export async function promptForUrl(defaultUrl?: string): Promise<string | undefined> {
    const url = await vscode.window.showInputBox({
        prompt: 'Enter the URL for the requirement (leave empty if none)',
        value: defaultUrl || '',
        placeHolder: 'e.g., https://example.com/requirements/REQ-123',
        validateInput: (input) => {
            if (input === '') {
                return null; // Empty input is acceptable
            }
            try {
                new URL(input);
                return null; // Valid URL, but it's kinda strict (protocol required)
            } catch {
                return 'Invalid URL format.';
            }
        }
    });
    return url !== undefined ? url.trim() : undefined;
}
