// src/extension.ts

import * as vscode from 'vscode';
import { loadAnnotations } from './utils/storage';
import { applyAnnotationsToEditor, updateAnnotationsOnDocumentChange } from './utils/decorations';
import { registerHoverProvider } from './utils/hoverProvider';
import { registerAddAnnotationCommand } from './commands/addAnnotation';
import { registerDeleteAnnotationCommand } from './commands/deleteAnnotation';
import { registerModifyAnnotationCommand } from './commands/modifyAnnotation';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension activated.');
  loadAnnotations();

  // Register commands
  registerAddAnnotationCommand(context);
  registerDeleteAnnotationCommand(context);
  registerModifyAnnotationCommand(context);

  // Apply annotations to all open editors
  vscode.window.visibleTextEditors.forEach(editor => {
    applyAnnotationsToEditor(editor);
  });

  // Apply annotations when a text editor is opened
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      applyAnnotationsToEditor(editor);
    }
  });

  // Update annotations on text change
  vscode.workspace.onDidChangeTextDocument(event => {
    updateAnnotationsOnDocumentChange(event);
  });

  // Register hover provider
  registerHoverProvider(context);
}

export function deactivate() {
  console.log('Extension deactivated.');
}
