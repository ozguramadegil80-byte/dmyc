const { spawnSync } = require('child_process');

function runPsql(sql) {
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      'dmyc-postgres',
      'psql',
      '-U',
      process.env.POSTGRES_USER || 'dmyc_app',
      '-d',
      process.env.POSTGRES_DB || 'dmyc_dev',
      '-v',
      'ON_ERROR_STOP=1'
    ],
    {
      input: sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
}

module.exports = { runPsql };
