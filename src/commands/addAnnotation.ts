// src/commands/addAnnotation.ts

import * as vscode from 'vscode';
import { Annotation, annotations, generateUniqueId } from '../utils/annotations';
import { promptForAnnotation, promptForUrl } from '../utils/prompts';
import { promptForColor } from '../webviews/colorPicker';
import { saveAnnotations } from '../utils/storage';
import { applyDecoration } from '../utils/decorations';

// Register the 'extension.addAnnotation' command
export function registerAddAnnotationCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.addAnnotation', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor detected.');
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      vscode.window.showInformationMessage('No code selected.');
      return;
    }

    const annotationText = await promptForAnnotation();
    if (!annotationText) {
      vscode.window.showInformationMessage('Annotation cancelled or empty.');
      return;
    }

    const annotationUrl = await promptForUrl();
    if (annotationUrl === undefined) {
      vscode.window.showInformationMessage('Annotation cancelled or invalid URL.');
      return;
    }

    const annotationColor = await promptForColor(context);
    if (!annotationColor) {
      vscode.window.showInformationMessage('No color selected.');
      return;
    }

    const annotationId = generateUniqueId();

    const annotation: Annotation = {
      id: annotationId,
      filePath: editor.document.uri.fsPath,
      range: new vscode.Range(selection.start, selection.end),
      text: annotationText,
      color: annotationColor,
      url: annotationUrl || undefined
    };

    annotations.push(annotation);
    saveAnnotations();
    applyDecoration(annotation, editor);
  });

  context.subscriptions.push(disposable);
}
