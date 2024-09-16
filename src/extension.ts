import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface Annotation {
	id: string;
	filePath: string;
	range: vscode.Range;
	text: string;
	color: string;
	url?: string;
}


interface SerializedAnnotation {
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

let annotations: Annotation[] = [];
const decorationTypeMap: { [key: string]: vscode.TextEditorDecorationType } = {};

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension activated.');
	loadAnnotations();

	// Register the add annotation command
	let disposable = vscode.commands.registerCommand('extension.addAnnotation', async () => {
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

	// Register the delete annotation command
	let deleteDisposable = vscode.commands.registerCommand('extension.deleteAnnotation', async () => {
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
				return;
			}
			annotationToDelete = selected.annotation;
		}

		// Remove the annotation
		annotations = annotations.filter(a => a.id !== annotationToDelete.id);
		saveAnnotations();

		// Re-apply annotations to the editor
		applyAnnotationsToEditor(editor);

		// Remove decoration type if no longer used
		if (!annotations.some(a => a.color === annotationToDelete.color)) {
			const decorationType = decorationTypeMap[annotationToDelete.color];
			decorationType.dispose();
			delete decorationTypeMap[annotationToDelete.color];
		}

		vscode.window.showInformationMessage('Annotation deleted.');
	});

	context.subscriptions.push(deleteDisposable);

	// Register the modify annotation command
	let modifyDisposable = vscode.commands.registerCommand('extension.modifyAnnotation', async () => {
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

		// Update the annotation
		annotationToModify.text = newText;
		annotationToModify.color = newColor;
		annotationToModify.url = newUrl || undefined;

		// Save changes and update decorations
		saveAnnotations();
		applyAnnotationsToEditor(editor);

		vscode.window.showInformationMessage('Annotation modified.');
	});

	context.subscriptions.push(modifyDisposable);


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

function promptForAnnotation(defaultText?: string): Thenable<string | undefined> {
	return vscode.window.showInputBox({
		prompt: 'Enter requirement specification for the selected code',
		value: defaultText || '',
		placeHolder: 'e.g., Implements feature X'
	});
}

async function promptForUrl(defaultUrl?: string): Promise<string | undefined> {
	const url = await vscode.window.showInputBox({
		prompt: 'Enter the URL for the requirement (leave empty if none)',
		value: defaultUrl || '',
		placeHolder: 'e.g., https://example.com/requirements/REQ-123',
		validateInput: (input) => {
			if (input === '') {
				return null; // Empty input is acceptable for now
			}
			try {
				new URL(input);
				return null; // Valid URL (kinda strict though) #TODO: Improve validation
			} catch {
				return 'Invalid URL format.';
			}
		}
	});
	return url !== undefined ? url.trim() : undefined;
}


// Maybe use a library for a color picker in the future
function getWebviewContent(defaultColor: string): string {
	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
	  <style>
		body {
		  font-family: sans-serif;
		  margin: 0;
		  padding: 10px;
		}
		.container {
		  display: flex;
		  flex-direction: column;
		  align-items: center;
		}
		#colorPicker {
		  width: 100%;
		  height: 150px;
		}
		#colorValue {
		  margin-top: 10px;
		  font-size: 16px;
		}
		#buttons {
		  margin-top: 20px;
		}
		button {
		  margin: 0 5px;
		  padding: 5px 10px;
		  font-size: 14px;
		}
	  </style>
	</head>
	<body>
    <div class="container">
      <input type="color" id="colorPicker" value="${defaultColor}">
      <div id="colorValue">${defaultColor}</div>
      <div id="buttons">
        <button id="selectButton">Select</button>
        <button id="cancelButton">Cancel</button>
      </div>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      const colorPicker = document.getElementById('colorPicker');
      const colorValue = document.getElementById('colorValue');
      const selectButton = document.getElementById('selectButton');
      const cancelButton = document.getElementById('cancelButton');

      // Update colorValue display on load
      colorValue.textContent = colorPicker.value;

      colorPicker.addEventListener('input', () => {
        colorValue.textContent = colorPicker.value;
      });

      selectButton.addEventListener('click', () => {
        vscode.postMessage({
          command: 'colorSelected',
          color: colorPicker.value
        });
      });

      cancelButton.addEventListener('click', () => {
        vscode.postMessage({
          command: 'cancel'
        });
      });
    </script>
  </body>
  </html>
	`;
}


async function promptForColor(context: vscode.ExtensionContext, defaultColor?: string): Promise<string | undefined> {
	return new Promise((resolve) => {
		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'colorPicker',
			'Select Highlight Color',
			vscode.ViewColumn.Active,
			{
				enableScripts: true
			}
		);

		// Set the webview's HTML content, passing the default color
		panel.webview.html = getWebviewContent(defaultColor || '#000000');

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

function generateUniqueId(): string {
	return Math.random().toString(36).substr(2, 9);
}

function saveAnnotations() {
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

	// Convert 'vscode.Range' and 'vscode.Position' to plain objects
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

function loadAnnotations() {
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

			annotations = loadedAnnotations.map((annotationData: SerializedAnnotation) => {
				// Reconstruct the vscode.Range and vscode.Position objects
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

				return annotation;
			});

		} catch (error) {
			console.error('Error parsing annotations file:', error);
		}
	} else {
		console.log('No annotations file found.');
	}
}

function applyDecoration(annotation: Annotation, editor: vscode.TextEditor) {
	console.log(`Applying decoration for annotation ID: ${annotation.id}`);
	const decorationType = getDecorationType(annotation.color);
	editor.setDecorations(decorationType, [annotation.range]);
}

function getDecorationType(color: string): vscode.TextEditorDecorationType {
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



function applyAnnotationsToEditor(editor: vscode.TextEditor) {
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

function updateAnnotationsOnDocumentChange(event: vscode.TextDocumentChangeEvent) {
	const document = event.document;
	const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
	if (!editor) {
		return;
	}

	console.log(`Document changed: ${document.uri.fsPath}`);
	applyAnnotationsToEditor(editor);
}

function findAnnotationsAtPosition(filePath: string, position: vscode.Position): Annotation[] {
	return annotations.filter(annotation => {
		return annotation.filePath === filePath && annotation.range.contains(position);
	});
}


export function deactivate() {
	console.log('Extension deactivated.');
}
