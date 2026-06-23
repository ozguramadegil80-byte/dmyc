const fs = require('fs');
const path = require('path');
const { runPsql } = require('./lib/docker-psql');

const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migrations found.');
  process.exit(0);
}

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  console.log(`Applying ${file}`);
  runPsql(sql);
}
