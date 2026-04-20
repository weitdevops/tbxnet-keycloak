'use strict';

require('dotenv').config();
const fs = require('fs');
const { createPartner } = require('./create-partner');

async function bulkCreate(csvPath) {
  const lines = fs.readFileSync(csvPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'));

  const [, ...rows] = lines; // saltar header

  const results = { created: [], failed: [] };

  for (const row of rows) {
    const [tenantId, affiliatesArg, cloudpayArg] = row.split(',');
    if (!tenantId?.trim()) continue;

    const affiliatesRoles = affiliatesArg?.trim() ? affiliatesArg.trim().split('|') : [];
    const cloudpayRoles = cloudpayArg?.trim() ? cloudpayArg.trim().split('|') : [];

    try {
      const result = await createPartner(tenantId.trim(), affiliatesRoles, cloudpayRoles);
      results.created.push(result);
    } catch (err) {
      const msg = err.response?.data?.errorMessage || err.message;
      console.error(`  ERROR [${tenantId}]: ${msg}`);
      results.failed.push({ tenantId, error: msg });
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Creados:  ${results.created.length}`);
  console.log(`Fallidos: ${results.failed.length}`);

  if (results.failed.length > 0) {
    fs.writeFileSync('bulk-errors.json', JSON.stringify(results.failed, null, 2));
    console.log(`Errores guardados en: bulk-errors.json`);
  }

  const successCsv = results.created
    .map(r => `${r.clientId},${r.clientSecret}`)
    .join('\n');
  fs.writeFileSync('bulk-credentials.csv', `clientId,clientSecret\n${successCsv}`);
  console.log(`Credenciales guardadas en: bulk-credentials.csv`);
}

const csvPath = process.argv[2] || 'partners-sample.csv';

bulkCreate(csvPath)
  .then(() => process.exit(0))
  .catch(err => { console.error(err.message); process.exit(1); });
