'use strict';

require('dotenv').config();
const { adminRequest } = require('./keycloak-admin');

async function setupDeveloperPortal() {
  const clientId = 'developer-portal';

  const existing = await adminRequest('GET', `/clients?clientId=${clientId}`);
  let client = existing[0];

  if (!client) {
    await adminRequest('POST', '/clients', {
      clientId,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      standardFlowEnabled: true,
      serviceAccountsEnabled: true,
      directAccessGrantsEnabled: false,
      redirectUris: ['http://localhost:*', 'https://developer-portal.tbxapis.com/*'],
      webOrigins: ['+'],
    });

    const clients = await adminRequest('GET', `/clients?clientId=${clientId}`);
    client = clients[0];
    console.log(`Client creado: ${clientId} (id: ${client.id})`);
  } else {
    console.log(`Client ya existe: ${clientId} (id: ${client.id})`);
  }

  console.log('\n⚠️  Pasos manuales requeridos en Keycloak UI:');
  console.log('1. Realm Settings → General → Token Exchange: ON');
  console.log('2. Identity Providers → Add → Google');
  console.log('   - Client ID y Secret de Google Cloud Console');
  console.log('   - Alias: google');
  console.log('3. Client "developer-portal" → Authorization → ON');
  console.log('4. Authorization → Policies → Create → Group Policy:');
  console.log('   - Nombre: tenant-access-policy');
  console.log('   - Lógica: el usuario debe pertenecer al grupo "tenant:<audience>"');
  console.log('   - Groups: dejar vacío (se valida dinámicamente en Token Exchange)');
  console.log('   Nota: la validación de grupo por audience requiere un JS Policy');
  console.log('   con lógica: $evaluation.grant() si el user está en el grupo "tenant:" + audience_pedida');

  const creds = await adminRequest('GET', `/clients/${client.id}/client-secret`);
  console.log(`\nclient_id:     ${clientId}`);
  console.log(`client_secret: ${creds.value}`);
  console.log('\nGuardar client_secret en .env como DEVELOPER_PORTAL_SECRET');
}

setupDeveloperPortal()
  .then(() => process.exit(0))
  .catch(err => { console.error(err.response?.data || err.message); process.exit(1); });
