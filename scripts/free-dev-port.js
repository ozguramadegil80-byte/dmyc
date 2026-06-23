const { execFileSync, spawnSync } = require('child_process');

const ports = process.argv
  .slice(2)
  .map((value) => Number(value))
  .filter((value) => Number.isInteger(value) && value > 0);

if (ports.length === 0) {
  console.log('No port was provided.');
  process.exit(0);
}

if (process.platform === 'win32') {
  freeWindowsPorts(ports);
} else {
  freeUnixPorts(ports);
}

function freeWindowsPorts(targetPorts) {
  const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);

    if (parts.length < 5 || parts[0] !== 'TCP' || parts[3] !== 'LISTENING') {
      continue;
    }

    const localAddress = parts[1];
    const pid = parts[4];
    const port = Number(localAddress.slice(localAddress.lastIndexOf(':') + 1));

    if (targetPorts.includes(port)) {
      pids.add(pid);
    }
  }

  killWindowsPids([...pids]);
}

function killWindowsPids(pids) {
  if (pids.length === 0) {
    console.log('Dev ports are free.');
    return;
  }

  let failed = false;

  for (const pid of pids) {
    const name = getWindowsProcessName(pid);
    console.log(`Stopping process ${pid}${name ? ` (${name})` : ''} on a DMyC dev port.`);
    const result = spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'inherit' });

    if (result.status !== 0) {
      failed = true;
      console.error(`Could not stop process ${pid}. Close it manually or run the command from an elevated terminal.`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

function getWindowsProcessName(pid) {
  try {
    const output = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
    }).trim();
    const match = output.match(/^"([^"]+)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function freeUnixPorts(targetPorts) {
  const pids = new Set();

  for (const port of targetPorts) {
    const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });

    if (result.status === 0 && result.stdout.trim()) {
      for (const pid of result.stdout.trim().split(/\s+/)) {
        pids.add(pid);
      }
    }
  }

  if (pids.size === 0) {
    console.log('Dev ports are free.');
    return;
  }

  for (const pid of pids) {
    console.log(`Stopping process ${pid} on a DMyC dev port.`);
    const result = spawnSync('kill', ['-TERM', pid], { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error(`Could not stop process ${pid}. Close it manually or rerun with enough permission.`);
      process.exit(1);
    }
  }
}
