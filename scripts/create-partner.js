'use strict';

require('dotenv').config();
const { adminRequest } = require('./keycloak-admin');

async function assignResourceRoles(clientUUID, apiName, roles) {
  const apiClients = await adminRequest('GET', `/clients?clientId=${apiName}`);
  const apiClient = apiClients[0];
  if (!apiClient) {
    console.warn(`  WARN: Client "${apiName}" no encontrado, saltando roles`);
    return;
  }

  const availableRoles = await adminRequest('GET', `/clients/${apiClient.id}/roles`);
  const rolesToAssign = availableRoles.filter(r => roles.includes(r.name));

  if (rolesToAssign.length === 0) {
    console.warn(`  WARN: Ningún rol encontrado en ${apiName} para: ${roles.join(', ')}`);
    return;
  }

  const sa = await adminRequest('GET', `/clients/${clientUUID}/service-account-user`);
  await adminRequest('POST', `/users/${sa.id}/role-mappings/clients/${apiClient.id}`, rolesToAssign);
  console.log(`  Roles asignados en ${apiName}: ${rolesToAssign.map(r => r.name).join(', ')}`);
}

async function createPartner(tenantId, affiliatesRoles = [], cloudpayRoles = []) {
  console.log(`Creando partner: ${tenantId}`);

  await adminRequest('POST', '/clients', {
    clientId: tenantId,
    enabled: true,
    protocol: 'openid-connect',
    publicClient: false,
    serviceAccountsEnabled: true,
    standardFlowEnabled: false,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    authorizationServicesEnabled: false,
  });

  const clients = await adminRequest('GET', `/clients?clientId=${tenantId}`);
  const client = clients[0];
  if (!client) throw new Error(`Client ${tenantId} no encontrado después de crear`);
  const clientUUID = client.id;
  console.log(`  Client UUID: ${clientUUID}`);

  const scopeName = `${tenantId}-scope`;
  await adminRequest('POST', '/client-scopes', {
    name: scopeName,
    protocol: 'openid-connect',
    attributes: { 'include.in.token.scope': 'false' },
    protocolMappers: [{
      name: `${tenantId}-audience-mapper`,
      protocol: 'openid-connect',
      protocolMapper: 'oidc-hardcoded-claim-mapper',
      config: {
        'claim.name': 'aud',
        'claim.value': tenantId,
        'jsonType.label': 'String',
        'id.token.claim': 'true',
        'access.token.claim': 'true',
        'userinfo.token.claim': 'true',
      },
    }],
  });

  const scopes = await adminRequest('GET', '/client-scopes');
  const scope = scopes.find(s => s.name === scopeName);
  if (!scope) throw new Error(`Scope ${scopeName} no encontrado`);

  await adminRequest('PUT', `/clients/${clientUUID}/default-client-scopes/${scope.id}`);
  console.log(`  Audience mapper configurado: aud="${tenantId}"`);

  if (affiliatesRoles.length > 0) {
    await assignResourceRoles(clientUUID, 'affiliates-api', affiliatesRoles);
  }

  if (cloudpayRoles.length > 0) {
    await assignResourceRoles(clientUUID, 'cloudpay-api', cloudpayRoles);
  }

  const creds = await adminRequest('GET', `/clients/${clientUUID}/client-secret`);
  console.log(`  ✓ Partner creado`);
  console.log(`  client_id:     ${tenantId}`);
  console.log(`  client_secret: ${creds.value}`);

  return { clientId: tenantId, clientSecret: creds.value };
}

module.exports = { createPartner, assignResourceRoles };

if (require.main === module) {
  const [,, tenantId, affiliatesArg, cloudpayArg] = process.argv;

  if (!tenantId) {
    console.error('Uso: node scripts/create-partner.js <tenantId> [affiliates-roles] [cloudpay-roles]');
    console.error('Ejemplo: node scripts/create-partner.js direct-tv "affiliates:read,affiliates:create" "payments:get"');
    process.exit(1);
  }

  const affiliatesRoles = affiliatesArg ? affiliatesArg.split(',') : [];
  const cloudpayRoles = cloudpayArg ? cloudpayArg.split(',') : [];

  createPartner(tenantId, affiliatesRoles, cloudpayRoles)
    .then(() => process.exit(0))
    .catch(err => { console.error(err.response?.data || err.message); process.exit(1); });
}
