import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { annotations } from '../../utils/annotations';
import * as prompts from '../../utils/prompts'; 
import * as colorPicker from '../../webviews/colorPicker';

describe('Add Annotation Command Tests', () => {
  let sandbox: sinon.SinonSandbox;

  // This runs before each test
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    annotations.length = 0; // Clear the annotations before each test
  });

  // This runs after each test
  afterEach(() => {
    sandbox.restore(); // Restore the sinon sandbox
  });

  it('should add an annotation when user provides valid inputs', async () => {
    // Stub user inputs for annotation
    sandbox.stub(prompts, 'promptForAnnotation').resolves('Test Annotation');
    sandbox.stub(prompts, 'promptForUrl').resolves('https://example.com');
    sandbox.stub(colorPicker, 'promptForColor').resolves('#FF0000');

    // Stub the active editor and selection
    const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
      document: {
        uri: { fsPath: 'test-file.ts' },
      },
      selection: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 10),
        isEmpty: false,
      },
      setDecorations: sinon.fake(),
    } as unknown as vscode.TextEditor));

    // Execute the `addAnnotation` command
    await vscode.commands.executeCommand('extension.addAnnotation');

    // Verify that the annotation was added to the annotations array
    assert.strictEqual(annotations.length, 1);
    const addedAnnotation = annotations[0];
    assert.strictEqual(addedAnnotation.text, 'Test Annotation');
    assert.strictEqual(addedAnnotation.url, 'https://example.com');
    assert.strictEqual(addedAnnotation.color, '#FF0000');
    assert.strictEqual(addedAnnotation.filePath, 'test-file.ts');
    assert.strictEqual(addedAnnotation.range.start.line, 0);
    assert.strictEqual(addedAnnotation.range.end.line, 0);
  });

  it('should not add an annotation when no text is provided', async () => {
    // Simulate user cancelling the annotation prompt
    sandbox.stub(prompts, 'promptForAnnotation').resolves(undefined);

    const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
      document: {
        uri: { fsPath: 'test-file.ts' },
      },
      selection: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 10),
        isEmpty: false,
      },
    } as unknown as vscode.TextEditor));

    await vscode.commands.executeCommand('extension.addAnnotation');

    // Verify that no annotation was added
    assert.strictEqual(annotations.length, 0);
  });

  it('should not add an annotation when selection is empty', async () => {
    // Stub user inputs for annotation
    sandbox.stub(prompts, 'promptForAnnotation').resolves('Test Annotation');
    sandbox.stub(prompts, 'promptForUrl').resolves('https://example.com');
    sandbox.stub(colorPicker, 'promptForColor').resolves('#FF0000');

    // Simulate an empty selection
    const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
      document: {
        uri: { fsPath: 'test-file.ts' },
      },
      selection: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 0),
        isEmpty: true,
      },
    } as unknown as vscode.TextEditor));

    await vscode.commands.executeCommand('extension.addAnnotation');

    // Verify that no annotation was added
    assert.strictEqual(annotations.length, 0);
  });

  it('should handle the case where no active editor exists', async () => {
    // Stub the activeTextEditor to return undefined
    const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => undefined);

    // Execute the command
    await vscode.commands.executeCommand('extension.addAnnotation');

    // Verify that no annotation was added
    assert.strictEqual(annotations.length, 0);
  });

  it('should not add an annotation when an invalid URL is provided', async () => {
    // Stub user inputs
    sandbox.stub(prompts, 'promptForAnnotation').resolves('Test Annotation');
    
    // Simulate invalid URL by returning undefined (as it would behave in the real validation)
    sandbox.stub(prompts, 'promptForUrl').resolves(undefined);  // Simulate invalid URL rejected
    
    // Stub the color picker to return a valid color without opening the webview
    sandbox.stub(colorPicker, 'promptForColor').resolves('#FF0000');  // Valid color
    
    // Stub the activeTextEditor with a valid selection
    const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => ({
      document: {
        uri: { fsPath: 'test-file.ts' },
      },
      selection: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 10),
        isEmpty: false,
      },
      setDecorations: sinon.fake(),
    } as unknown as vscode.TextEditor));
  
    // Execute the addAnnotation command
    await vscode.commands.executeCommand('extension.addAnnotation');
  
    // Verify that the annotation was not added because the invalid URL made the user "cancel" the operation
    assert.strictEqual(annotations.length, 0);  // Should be no annotations added
  });

});
