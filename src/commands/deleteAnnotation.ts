// src/commands/deleteAnnotation.ts

import * as vscode from 'vscode';
import { Annotation, annotations, decorationTypeMap, findAnnotationsAtPosition } from '../utils/annotations';
import { saveAnnotations } from '../utils/storage';
import { applyAnnotationsToEditor } from '../utils/decorations';

// Register the 'extension.deleteAnnotation' command
export function registerDeleteAnnotationCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.deleteAnnotation', async () => {
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
    // Thus, not so sure if I should allow same piece of code to have multiple annotations
    let annotationToDelete: Annotation;
    if (annotationsAtPosition.length === 1) {
      annotationToDelete = annotationsAtPosition[0];
    } else {
      // Show QuickPick to select which annotation to delete
      const selected = await vscode.window.showQuickPick(
        annotationsAtPosition.map(a => ({
          label: a.text,
          description: `Color: ${a.color}`,
          annotation: a
        })),
        {
          placeHolder: 'Select the annotation to delete'
        }
      );
      if (!selected) {
        // User canceled the selection
        // Also, I should implement an abort function for overall commands
        return;
      }
      annotationToDelete = selected.annotation;
    }

    // Remove the annotation from the annotations array
    const index = annotations.findIndex(a => a.id === annotationToDelete.id);
    if (index !== -1) {
      annotations.splice(index, 1);
    }

    // Save the updated annotations
    saveAnnotations();

    // Re-apply annotations to the editor
    applyAnnotationsToEditor(editor);

    // Remove decoration type if no longer used
    if (!annotations.some(a => a.color === annotationToDelete.color)) {
      const decorationType = decorationTypeMap[annotationToDelete.color];
      if (decorationType) {
        decorationType.dispose();
        delete decorationTypeMap[annotationToDelete.color];
      }
    }

    vscode.window.showInformationMessage('Annotation deleted.');
  });

  context.subscriptions.push(disposable);
}
