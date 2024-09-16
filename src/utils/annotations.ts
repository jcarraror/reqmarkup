// src/utils/annotations.ts

import * as vscode from 'vscode';

export interface Annotation {
    id: string;
    filePath: string;
    range: vscode.Range;
    text: string;
    color: string;
    url?: string;
}

// Maybe I can use a library for serialization like class-transformer?
// Dunno, still kinda dumb to TS :)
export interface SerializedAnnotation {
    id: string;
    filePath: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    text: string;
    color: string;
    url?: string;
}

// Global variables
export let annotations: Annotation[] = [];
export const decorationTypeMap: { [key: string]: vscode.TextEditorDecorationType } = {};

// Use uuid library instead of this?
// If this changes, it is possible to have retrocompatibility?
// TODO: Investigate this further
export function generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
}

export function findAnnotationsAtPosition(filePath: string, position: vscode.Position): Annotation[] {
    return annotations.filter(annotation => {
        return annotation.filePath === filePath && annotation.range.contains(position);
    });
}
