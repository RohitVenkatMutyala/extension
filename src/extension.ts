import * as vscode from 'vscode';
import { exec } from 'child_process';

const IMAGE_NAME = 'rohith3232/viz-compiler:v1';
const CONTAINER_NAME = 'viz';
const PORT = '8000';

export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.commands.registerCommand('viz.start', () => {
        
        vscode.window.showInformationMessage('🚀 Starting Viz Container...');
        
        // Get the current working directory (cross-platform)
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        const volumePath = workspaceFolder.replace(/\\/g, '/'); // Convert Windows paths to forward slashes for Docker

        // Step 1: Check if Docker is running
        exec('docker info', (dockerErr) => {
            if (dockerErr) {
                vscode.window.showErrorMessage('❌ Docker is not running. Please start Docker Desktop and try again.');
                return;
            }

            // Step 2: Check if image exists, if not pull it
            exec(`docker image inspect ${IMAGE_NAME}`, (imageErr) => {
                if (imageErr) {
                    vscode.window.showInformationMessage('⬇️ Image not found. Pulling from registry...');
                    pullImage();
                } else {
                    vscode.window.showInformationMessage('✅ Image already exists');
                    checkAndManageContainer(volumePath);
                }
            });
        });

        function pullImage() {
            exec(`docker pull ${IMAGE_NAME}`, (pullErr) => {
                if (pullErr) {
                    vscode.window.showErrorMessage(`❌ Failed to pull image: ${pullErr.message}`);
                    return;
                }
                vscode.window.showInformationMessage('✅ Image pulled successfully');
                checkAndManageContainer(volumePath);
            });
        }

        function checkAndManageContainer(volumePath: string) {
            // Step 3: Check if container exists
            exec(`docker ps -aq -f name=${CONTAINER_NAME}`, (err, stdout) => {
                if (err) {
                    vscode.window.showErrorMessage(`❌ Failed to check container: ${err.message}`);
                    return;
                }

                const containerExists = stdout.trim().length > 0;

                if (containerExists) {
                    // Step 4a: Container exists - check if it's running
                    exec(`docker ps -f name=${CONTAINER_NAME} --format="{{.State}}"`, (stateErr, state) => {
                        if (stateErr) {
                            vscode.window.showErrorMessage(`❌ Failed to check container state: ${stateErr.message}`);
                            return;
                        }

                        const isRunning = state.trim() === 'running' || state.trim() === '"running"';

                        if (isRunning) {
                            vscode.window.showInformationMessage('✅ Container is already running');
                            enterContainer();
                        } else {
                            // Container exists but not running - start it
                            vscode.window.showInformationMessage('🔄 Starting existing container...');
                            exec(`docker start ${CONTAINER_NAME}`, (startErr) => {
                                if (startErr) {
                                    vscode.window.showErrorMessage(`❌ Failed to start container: ${startErr.message}`);
                                    return;
                                }
                                vscode.window.showInformationMessage('✅ Container started');
                                waitAndEnter();
                            });
                        }
                    });
                } else {
                    // Step 4b: Container doesn't exist - create it
                    vscode.window.showInformationMessage('🆕 Creating new container...');
                    const createCmd = `docker run -d --name ${CONTAINER_NAME} -v "${volumePath}:/app/tests" -p ${PORT}:${PORT} ${IMAGE_NAME}`;
                    
                    exec(createCmd, (createErr) => {
                        if (createErr) {
                            vscode.window.showErrorMessage(`❌ Failed to create container: ${createErr.message}`);
                            return;
                        }
                        vscode.window.showInformationMessage('✅ Container created successfully');
                        waitAndEnter();
                    });
                }
            });
        }

        function waitAndEnter() {
            // Wait for container to be fully ready
            setTimeout(() => {
                enterContainer();
            }, 1500);
        }

        function enterContainer() {
            // Verify container is running before entering
            exec(`docker ps -f name=${CONTAINER_NAME} --format="{{.State}}"`, (checkErr, state) => {
                if (checkErr || (state.trim() !== 'running' && state.trim() !== '"running"')) {
                    vscode.window.showErrorMessage('❌ Container is not in running state');
                    return;
                }

                openTerminal();
            });
        }

        function openTerminal() {
            const terminal = vscode.window.createTerminal("Viz Container");
            terminal.show();

            // Enter the container shell with -it flags for interactive terminal
            // -i: Keep stdin open even if not attached
            // -t: Allocate a pseudo-terminal
            terminal.sendText(`docker exec -it ${CONTAINER_NAME} sh`);
            
            vscode.window.showInformationMessage('🎉 Connected to Viz Container');
        }

    });

    context.subscriptions.push(disposable);

    // 🔥 Status bar button
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    button.text = "🚀 Viz";
    button.command = "viz.start";
    button.tooltip = "Start Viz Container";
    button.show();

    context.subscriptions.push(button);
}

export function deactivate() {}