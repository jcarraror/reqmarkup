// src/webviews/colorPicker.js
// This sucks a lot, but it's the only way to get the color picker to work in the webview
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
