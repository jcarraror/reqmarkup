// src/commands/modifyAnnotation.ts

import * as vscode from 'vscode';
import { Annotation, annotations, findAnnotationsAtPosition, decorationTypeMap } from '../utils/annotations';
import { promptForAnnotation, promptForUrl } from '../utils/prompts';
import { promptForColor } from '../webviews/colorPicker';
import { saveAnnotations } from '../utils/storage';
import { applyAnnotationsToEditor } from '../utils/decorations';

export function registerModifyAnnotationCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.modifyAnnotation', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor detected.');
      return;
    }

    const position = editor.selection.active;
    const annotationsAtPosition = findAnnotationsAtPosition(editor.document.uri.fsPath, position);

    if (annotationsAtPosition.length === 0) {
      vscode.window.showInformationMessage('No annotations found at the cursor position.');
      return;
    }

    // If there's more than one annotation, let the user choose
    let annotationToModify: Annotation;
    if (annotationsAtPosition.length === 1) {
      annotationToModify = annotationsAtPosition[0];
    } else {
      // Show QuickPick to select which annotation to modify
      const selected = await vscode.window.showQuickPick(
        annotationsAtPosition.map(a => ({
          label: a.text,
          description: `Color: ${a.color}`,
          annotation: a
        })),
        {
          placeHolder: 'Select the annotation to modify'
        }
      );
      if (!selected) {
        // User canceled the selection
        return;
      }
      annotationToModify = selected.annotation;
    }

    // Prompt for new annotation text
    const newText = await promptForAnnotation(annotationToModify.text);
    if (newText === undefined) {
      vscode.window.showInformationMessage('Modification cancelled or invalid.');
      return;
    }

    // Prompt for new URL
    const newUrl = await promptForUrl(annotationToModify.url);
    if (newUrl === undefined) {
      vscode.window.showInformationMessage('Modification cancelled or invalid URL.');
      return;
    }

    // Prompt for new color
    const newColor = await promptForColor(context, annotationToModify.color);
    if (!newColor) {
      vscode.window.showInformationMessage('No color selected.');
      return;
    }

    // If the color has changed, manage decoration types
    const oldColor = annotationToModify.color;

    // Update the annotation
    annotationToModify.text = newText;
    annotationToModify.color = newColor;
    annotationToModify.url = newUrl || undefined;

    // Save changes and update decorations
    saveAnnotations();
    applyAnnotationsToEditor(editor);

    // Dispose of old decoration type if no longer used
    if (oldColor !== newColor && !annotations.some(a => a.color === oldColor)) {
      const oldDecorationType = decorationTypeMap[oldColor];
      if (oldDecorationType) {
        oldDecorationType.dispose();
        delete decorationTypeMap[oldColor];
      }
    }

    vscode.window.showInformationMessage('Annotation modified.');
  });

  context.subscriptions.push(disposable);
}
