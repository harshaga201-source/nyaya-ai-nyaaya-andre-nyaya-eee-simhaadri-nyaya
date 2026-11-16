const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');

console.log('================================================================');
console.log('        NYAYASATHI - DEMO LAUNCHER (FastAPI + Expo Web)');
console.log('================================================================');
console.log('Starting Python FastAPI Backend on port 8000...');

// Path to node & python
const env = { ...process.env };
const nodeBin = 'C:\\Users\\Admin\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin';
const toolsBin = path.join(rootDir, 'tools', 'bin');
env.PATH = `${nodeBin};${toolsBin};${env.PATH || ''}`;
env.EXPO_HOME = path.join(rootDir, '.expo');
env.EXPO_NO_TELEMETRY = '1';

// Start backend
const backend = spawn('python', ['-m', 'uvicorn', 'backend.main:app', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
  shell: true,
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
});

// Wait 2 seconds for backend to initialize, then start Expo Web
setTimeout(() => {
  console.log('Starting Expo Web Server on port 8081...');
  const expoCmd = path.join(frontendDir, 'node_modules', '.bin', 'expo.cmd');
  const web = spawn(expoCmd, ['start', '--web', '--port', '8081'], {
    cwd: frontendDir,
    env,
    stdio: 'inherit',
    shell: true,
  });

  web.on('error', (err) => {
    console.error('Failed to start Expo Web:', err);
  });
}, 2500);

process.on('SIGINT', () => {
  backend.kill();
  process.exit();
});
