const { spawn } = require('child_process');

const commands = [
  { name: 'api', args: ['--prefix', 'apps/api', 'run', 'start'] },
  { name: 'web', args: ['--prefix', 'apps/web', 'run', 'dev'] },
  { name: 'mobile', args: ['--prefix', 'apps/mobile', 'run', 'start'] },
];

const children = [];
let shuttingDown = false;

for (const command of commands) {
  const child = spawnNpm(command.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  children.push(child);
  pipeWithPrefix(child.stdout, command.name);
  pipeWithPrefix(child.stderr, command.name);

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${command.name}] exited with code ${code}`);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function spawnNpm(args, options) {
  if (process.platform === 'win32') {
    return spawn('cmd.exe', ['/d', '/s', '/c', ['npm.cmd', ...args].join(' ')], options);
  }

  return spawn('npm', args, options);
}

function pipeWithPrefix(stream, name) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim()) {
        console.log(`[${name}] ${line}`);
      }
    }
  });
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }
}
