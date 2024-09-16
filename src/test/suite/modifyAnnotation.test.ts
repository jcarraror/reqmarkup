import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { annotations } from '../../utils/annotations';
import * as prompts from '../../utils/prompts';
import * as colorPicker from '../../webviews/colorPicker';

describe('Modify Annotation Command Tests', () => {
    let sandbox: sinon.SinonSandbox;

    // This runs before each test
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        annotations.length = 0; // Clear annotations before each test
    });

    // This runs after each test
    afterEach(() => {
        sandbox.restore(); // Restore the sinon sandbox
    });

    it('should modify an annotation when user provides valid inputs', async () => {
        // Add an annotation to modify
        annotations.push({
            id: 'test-id',
            filePath: 'test-file.ts',
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            text: 'Old Annotation',
            color: '#FF0000',
            url: 'https://old-url.com',
        });

        // Stub user inputs for modification
        sandbox.stub(prompts, 'promptForAnnotation').resolves('New Annotation');
        sandbox.stub(prompts, 'promptForUrl').resolves('https://new-url.com');
        sandbox.stub(colorPicker, 'promptForColor').resolves('#00FF00');

        // Mock the activeTextEditor and ensure setDecorations is mocked
        const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
            document: {
                uri: { fsPath: 'test-file.ts' },
            },
            selection: {
                active: new vscode.Position(0, 5), // Position inside the annotation
            },
            setDecorations: sinon.fake(), // Mock setDecorations
        } as unknown as vscode.TextEditor));

        // Execute the modifyAnnotation command
        await vscode.commands.executeCommand('extension.modifyAnnotation');

        // Verify that the annotation was modified
        assert.strictEqual(annotations.length, 1);
        const modifiedAnnotation = annotations[0];
        assert.strictEqual(modifiedAnnotation.text, 'New Annotation');
        assert.strictEqual(modifiedAnnotation.url, 'https://new-url.com');
        assert.strictEqual(modifiedAnnotation.color, '#00FF00');
    });

    it('should modify the selected annotation when multiple annotations exist', async () => {
        // Add multiple annotations at the same position
        annotations.push({
            id: 'annotation-1',
            filePath: 'test-file.ts',
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            text: 'First Annotation',
            color: '#FF0000',
            url: 'https://old-url-1.com',
        });
        annotations.push({
            id: 'annotation-2',
            filePath: 'test-file.ts',
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            text: 'Second Annotation',
            color: '#00FF00',
            url: 'https://old-url-2.com',
        });

        // Stub user inputs for modification
        sandbox.stub(prompts, 'promptForAnnotation').resolves('Modified Second Annotation');
        sandbox.stub(prompts, 'promptForUrl').resolves('https://new-url-2.com');
        sandbox.stub(colorPicker, 'promptForColor').resolves('#0000FF');

        // Stub the activeTextEditor and ensure setDecorations is mocked
        const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
            document: {
                uri: { fsPath: 'test-file.ts' },
            },
            selection: {
                active: new vscode.Position(0, 5), // Position inside the annotations
            },
            setDecorations: sinon.fake(), // Mock setDecorations
        } as unknown as vscode.TextEditor));

        // Stub the showQuickPick to simulate user selecting the second annotation
        const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'Second Annotation',
            description: 'Color: #00FF00',
            annotation: annotations[1], // User selects the second annotation
        } as unknown as vscode.QuickPickItem);

        // Execute the modifyAnnotation command
        await vscode.commands.executeCommand('extension.modifyAnnotation');

        // Verify that the correct annotation was modified
        assert.strictEqual(annotations.length, 2);
        assert.strictEqual(annotations[1].text, 'Modified Second Annotation');
        assert.strictEqual(annotations[1].url, 'https://new-url-2.com');
        assert.strictEqual(annotations[1].color, '#0000FF');
    });

    it('should not modify anything when no annotation exists at the cursor position', async () => {
        // Add an annotation outside the cursor position
        annotations.push({
            id: 'test-id',
            filePath: 'test-file.ts',
            range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 10)),
            text: 'Test Annotation',
            color: '#FF0000',
            url: 'https://old-url.com',
        });

        // Stub the activeTextEditor and ensure setDecorations is mocked
        const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
            document: {
                uri: { fsPath: 'test-file.ts' },
            },
            selection: {
                active: new vscode.Position(0, 5), // Cursor is outside the annotation
            },
            setDecorations: sinon.fake(), // Mock setDecorations
        } as unknown as vscode.TextEditor));

        // Execute the modifyAnnotation command
        await vscode.commands.executeCommand('extension.modifyAnnotation');

        // Verify that the annotation remains unchanged
        assert.strictEqual(annotations.length, 1);
        const unchangedAnnotation = annotations[0];
        assert.strictEqual(unchangedAnnotation.text, 'Test Annotation');
        assert.strictEqual(unchangedAnnotation.color, '#FF0000');
        assert.strictEqual(unchangedAnnotation.url, 'https://old-url.com');
    });

    it('should not modify an annotation if user cancels modification prompts', async () => {
        // Add an annotation to modify
        annotations.push({
            id: 'test-id',
            filePath: 'test-file.ts',
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            text: 'Old Annotation',
            color: '#FF0000',
            url: 'https://old-url.com',
        });

        // Stub user input prompts to simulate user cancellation
        sandbox.stub(prompts, 'promptForAnnotation').resolves(undefined); // Simulate cancellation
        sandbox.stub(prompts, 'promptForUrl').resolves(undefined);
        sandbox.stub(colorPicker, 'promptForColor').resolves(undefined);

        // Stub the activeTextEditor and ensure setDecorations is mocked
        const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
            document: {
                uri: { fsPath: 'test-file.ts' },
            },
            selection: {
                active: new vscode.Position(0, 5), // Position inside the annotation
            },
            setDecorations: sinon.fake(), // Mock setDecorations
        } as unknown as vscode.TextEditor));

        // Execute the modifyAnnotation command
        await vscode.commands.executeCommand('extension.modifyAnnotation');

        // Verify that the annotation was not modified
        assert.strictEqual(annotations.length, 1);
        const unchangedAnnotation = annotations[0];
        assert.strictEqual(unchangedAnnotation.text, 'Old Annotation');
        assert.strictEqual(unchangedAnnotation.color, '#FF0000');
        assert.strictEqual(unchangedAnnotation.url, 'https://old-url.com');
    });

    it('should handle the case where no active editor exists', async () => {
        // Stub the activeTextEditor to return undefined
        const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => undefined);
      
        // Execute the command
        await vscode.commands.executeCommand('extension.modifyAnnotation');
      
        // Verify that no annotation was added
        assert.strictEqual(annotations.length, 0);
      });

      it('should not modify an annotation when an invalid URL is provided', async () => {
        // Add an annotation to modify
        annotations.push({
          id: 'test-id',
          filePath: 'test-file.ts',
          range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
          text: 'Old Annotation',
          color: '#FF0000',
          url: 'https://old-url.com',
        });
      
        // Stub user inputs for modification
        sandbox.stub(prompts, 'promptForAnnotation').resolves('Modified Annotation');
        
        // Simulate invalid URL by returning undefined (as the input box would block invalid input)
        sandbox.stub(prompts, 'promptForUrl').resolves(undefined);  // Simulate invalid URL rejection
        
        // Stub the color picker to return a valid color without opening the webview
        sandbox.stub(colorPicker, 'promptForColor').resolves('#00FF00');  // Valid color
      
        // Stub the activeTextEditor and simulate selection inside the annotation
        const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
          document: {
            uri: { fsPath: 'test-file.ts' },
          },
          selection: {
            active: new vscode.Position(0, 5),  // Position inside the annotation
          },
          setDecorations: sinon.fake(),  // Mock setDecorations
        } as unknown as vscode.TextEditor));
      
        // Execute the modifyAnnotation command
        await vscode.commands.executeCommand('extension.modifyAnnotation');
      
        // Verify that the annotation was not modified because of the invalid URL
        assert.strictEqual(annotations.length, 1);  // Annotation still exists
        const unchangedAnnotation = annotations[0];
        assert.strictEqual(unchangedAnnotation.text, 'Old Annotation');  // Text is unchanged
        assert.strictEqual(unchangedAnnotation.url, 'https://old-url.com');  // URL is unchanged
        assert.strictEqual(unchangedAnnotation.color, '#FF0000');  // Color is unchanged
      });
      
      

});
