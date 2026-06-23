const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'db', 'exports', 'mobile_vehicle_catalog.json');
const targetDir = path.join(__dirname, '..', 'apps', 'mobile', 'src', 'data');
const targetPath = path.join(targetDir, 'mobile_vehicle_catalog.json');

if (!fs.existsSync(sourcePath)) {
  console.error('Mobile catalog export not found. Run npm run db:export:mobile first.');
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);

console.log(`Synced catalog to ${path.relative(process.cwd(), targetPath)}`);
