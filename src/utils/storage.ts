// src/utils/storage.ts

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Annotation, SerializedAnnotation, annotations } from './annotations';

export function saveAnnotations() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace folder found.');
        return;
    }

    const annotationsFile = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'annotations.json');
    console.log('Saving annotations to:', annotationsFile);

    // Ensure the .vscode directory exists
    const vscodeDirectory = path.dirname(annotationsFile);
    if (!fs.existsSync(vscodeDirectory)) {
        fs.mkdirSync(vscodeDirectory);
        console.log('Created .vscode directory:', vscodeDirectory);
    }

    const annotationsToSave = annotations.map((annotation: Annotation) => ({
        id: annotation.id,
        filePath: annotation.filePath,
        range: {
            start: {
                line: annotation.range.start.line,
                character: annotation.range.start.character,
            },
            end: {
                line: annotation.range.end.line,
                character: annotation.range.end.character,
            },
        },
        text: annotation.text,
        color: annotation.color,
        url: annotation.url
    }));

    fs.writeFileSync(annotationsFile, JSON.stringify(annotationsToSave, null, 2));
    console.log('Annotations saved.');
}

export function loadAnnotations() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace folder found.');
        return;
    }

    const annotationsFile = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'annotations.json');
    console.log('Annotations file path:', annotationsFile);

    if (fs.existsSync(annotationsFile)) {
        try {
            const content = fs.readFileSync(annotationsFile, 'utf8');
            const loadedAnnotations = JSON.parse(content) as SerializedAnnotation[];
            console.log(`Loaded ${loadedAnnotations.length} annotations from file.`);

            annotations.length = 0; // Clear existing annotations
            loadedAnnotations.forEach((annotationData: SerializedAnnotation) => {
                const range = new vscode.Range(
                    new vscode.Position(annotationData.range.start.line, annotationData.range.start.character),
                    new vscode.Position(annotationData.range.end.line, annotationData.range.end.character)
                );

                const annotation: Annotation = {
                    id: annotationData.id,
                    filePath: annotationData.filePath,
                    range: range,
                    text: annotationData.text,
                    color: annotationData.color,
                    url: annotationData.url
                };

                annotations.push(annotation);
            });

        } catch (error) {
            console.error('Error parsing annotations file:', error);
        }
    } else {
        console.log('No annotations file found.');
    }
}
