// src/utils/decorations.ts

import * as vscode from 'vscode';
import { annotations, decorationTypeMap, Annotation } from './annotations';

export function applyDecoration(annotation: Annotation, editor: vscode.TextEditor) {
    console.log(`Applying decoration for annotation ID: ${annotation.id}`);
    const decorationType = getDecorationType(annotation.color);
    editor.setDecorations(decorationType, [annotation.range]);
}

export function getDecorationType(color: string): vscode.TextEditorDecorationType {
    if (!decorationTypeMap[color]) {
        console.log(`Creating new decoration type for color: ${color}`);
        decorationTypeMap[color] = vscode.window.createTextEditorDecorationType({
            backgroundColor: color,
            isWholeLine: false
        });
    } else {
        console.log(`Using existing decoration type for color: ${color}`);
    }
    return decorationTypeMap[color];
}

export function applyAnnotationsToEditor(editor: vscode.TextEditor) {
    console.log(`Applying annotations to editor: ${editor.document.uri.fsPath}`);
    const editorAnnotations = annotations.filter(a => a.filePath === editor.document.uri.fsPath);
    console.log(`Found ${editorAnnotations.length} annotations for this editor.`);
    const colorToRanges: { [key: string]: vscode.Range[] } = {};

    editorAnnotations.forEach(annotation => {
        if (!colorToRanges[annotation.color]) {
            colorToRanges[annotation.color] = [];
        }
        colorToRanges[annotation.color].push(annotation.range);
    });

    Object.keys(colorToRanges).forEach(color => {
        const decorationType = getDecorationType(color);
        editor.setDecorations(decorationType, colorToRanges[color]);
    });
}

export function updateAnnotationsOnDocumentChange(event: vscode.TextDocumentChangeEvent) {
    const document = event.document;
    const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
    if (!editor) {
        return;
    }

    console.log(`Document changed: ${document.uri.fsPath}`);
    applyAnnotationsToEditor(editor);
}
