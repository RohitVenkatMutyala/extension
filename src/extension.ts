import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.commands.registerCommand('viz.start', () => {

        exec('docker ps -aq -f name=viz', (err, stdout) => {

            const exists = stdout.trim().length > 0;

            const runCmd = exists
                ? 'docker start viz'
                : 'docker run -dit --name viz -v "$(pwd):/app/tests" -p 8080:8080 rohith3232/viz-compiler:v1';

            exec(runCmd, () => {
                openTerminal();
            });
        });

        function openTerminal() {
            const terminal = vscode.window.createTerminal("Viz Container");
            terminal.show();

            // clear AFTER entering container
            terminal.sendText('docker exec -it viz sh -c "clear && exec sh"');
        }

    });

    context.subscriptions.push(disposable);

    // 🔥 Status bar button (optional but recommended)
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    button.text = "🚀 Viz";
    button.command = "viz.start";
    button.tooltip = "Start Viz Container";
    button.show();

    context.subscriptions.push(button);
}

export function deactivate() {}