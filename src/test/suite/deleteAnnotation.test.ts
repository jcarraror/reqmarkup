import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { annotations } from '../../utils/annotations';

describe('Delete Annotation Command Tests', () => {
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

  it('should delete an annotation when one annotation exists at the cursor position', async () => {
    // Add an annotation that we will later delete
    annotations.push({
      id: 'test-id',
      filePath: 'test-file.ts',
      range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
      text: 'Test Annotation',
      color: '#FF0000',
    });

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

    // Execute the deleteAnnotation command
    await vscode.commands.executeCommand('extension.deleteAnnotation');

    // Verify that the annotation was deleted
    assert.strictEqual(annotations.length, 0);
  });

  it('should delete the selected annotation when multiple annotations exist at the cursor position', async () => {
    // Add multiple annotations at the same position
    annotations.push({
      id: 'annotation-1',
      filePath: 'test-file.ts',
      range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
      text: 'First Annotation',
      color: '#FF0000',
    });
    annotations.push({
      id: 'annotation-2',
      filePath: 'test-file.ts',
      range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
      text: 'Second Annotation',
      color: '#00FF00',
    });

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

    // Stub the showQuickPick to simulate user selection
    const quickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves({
      label: 'Second Annotation',
      description: 'Color: #00FF00',
      annotation: annotations[1], // User chooses the second annotation
    } as unknown as vscode.QuickPickItem);

    // Execute the deleteAnnotation command
    await vscode.commands.executeCommand('extension.deleteAnnotation');

    // Verify that the correct annotation was deleted
    assert.strictEqual(annotations.length, 1);
    assert.strictEqual(annotations[0].id, 'annotation-1'); // First annotation should remain
  });

  it('should not delete anything when no annotation exists at the cursor position', async () => {
    // Add an annotation that is outside the cursor position
    annotations.push({
      id: 'test-id',
      filePath: 'test-file.ts',
      range: new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 10)),
      text: 'Test Annotation',
      color: '#FF0000',
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

    // Execute the deleteAnnotation command
    await vscode.commands.executeCommand('extension.deleteAnnotation');

    // Verify that no annotation was deleted
    assert.strictEqual(annotations.length, 1); // Annotation should still exist
  });

  it('should handle the case where no active editor exists', async () => {
    // Stub the activeTextEditor to return undefined
    const editorStub = sandbox.stub(vscode.window, 'activeTextEditor').get(() => undefined);
  
    // Execute the command
    await vscode.commands.executeCommand('extension.deleteAnnotation');
  
    // Verify that no annotation was added
    assert.strictEqual(annotations.length, 0);
  });
  
});
