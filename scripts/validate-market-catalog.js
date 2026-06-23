const fs = require('fs');
const path = require('path');

const markets = ['TR', 'GB'];
const exportDir = path.join(__dirname, '..', 'db', 'exports');
const reportPath = path.join(__dirname, '..', 'db', 'reports', 'market_catalog_validation.json');
const report = {
  generatedAt: new Date().toISOString(),
  markets: {},
  issues: [],
};

for (const marketCode of markets) {
  const filePath = path.join(exportDir, `mobile_vehicle_catalog_${marketCode}.json`);

  if (!fs.existsSync(filePath)) {
    report.issues.push(`${marketCode} export file is missing.`);
    continue;
  }

  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const invalidMarketRows = catalog.filter((item) => item.marketCode !== marketCode);

  report.markets[marketCode] = {
    recordCount: catalog.length,
    invalidMarketRowCount: invalidMarketRows.length,
  };

  if (invalidMarketRows.length > 0) {
    report.issues.push(`${marketCode} export contains rows from another market.`);
  }
}

if ((report.markets.TR?.recordCount ?? 0) === 0) {
  report.issues.push('TR default catalog is empty.');
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report, null, 2));

if (report.issues.length > 0) {
  process.exit(1);
}
