'use strict';

require('dotenv').config();
const { adminRequest } = require('./keycloak-admin');

const API_CLIENTS = [
  {
    clientId: 'affiliates-api',
    roles: ['affiliates:read', 'affiliates:create', 'affiliates:commission'],
  },
  {
    clientId: 'cloudpay-api',
    roles: ['payments:get', 'payments:create', 'payments:refund'],
  },
];

async function createApiClient(clientId, roles) {
  // Verificar si ya existe
  const existing = await adminRequest('GET', `/clients?clientId=${clientId}`);
  let client = existing[0];

  if (!client) {
    await adminRequest('POST', '/clients', {
      clientId,
      enabled: true,
      protocol: 'openid-connect',
      publicClient: false,
      serviceAccountsEnabled: false,
      standardFlowEnabled: false,
      bearerOnly: true,
    });

    const clients = await adminRequest('GET', `/clients?clientId=${clientId}`);
    client = clients[0];
    console.log(`Client creado: ${clientId} (id: ${client.id})`);
  } else {
    console.log(`Client ya existe: ${clientId} (id: ${client.id})`);
  }

  // Crear roles
  const existingRoles = await adminRequest('GET', `/clients/${client.id}/roles`);
  const existingRoleNames = existingRoles.map(r => r.name);

  for (const role of roles) {
    if (existingRoleNames.includes(role)) {
      console.log(`  Rol ya existe: ${role}`);
    } else {
      await adminRequest('POST', `/clients/${client.id}/roles`, { name: role });
      console.log(`  Rol creado: ${role}`);
    }
  }

  console.log(`✓ ${clientId} listo`);
}

async function main() {
  for (const { clientId, roles } of API_CLIENTS) {
    await createApiClient(clientId, roles);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err.response?.data || err.message); process.exit(1); });
