'use strict';

require('dotenv').config();
const { adminRequest } = require('./keycloak-admin');

async function createTenantGroup(tenantId) {
  const groupName = `tenant:${tenantId}`;

  const existingGroups = await adminRequest('GET', `/groups?search=${encodeURIComponent(groupName)}`);
  let group = existingGroups.find(g => g.name === groupName);

  if (!group) {
    await adminRequest('POST', '/groups', { name: groupName });
    const groups = await adminRequest('GET', `/groups?search=${encodeURIComponent(groupName)}`);
    group = groups.find(g => g.name === groupName);
    console.log(`Grupo creado: ${groupName} (id: ${group.id})`);
  } else {
    console.log(`Grupo ya existe: ${groupName} (id: ${group.id})`);
  }

  return group;
}

async function addDeveloperToTenant(developerEmail, tenantId) {
  const group = await createTenantGroup(tenantId);

  const users = await adminRequest('GET', `/users?email=${encodeURIComponent(developerEmail)}&exact=true`);
  const user = users[0];
  if (!user) throw new Error(`Usuario no encontrado: ${developerEmail}`);

  await adminRequest('PUT', `/users/${user.id}/groups/${group.id}`);
  console.log(`✓ ${developerEmail} → grupo tenant:${tenantId}`);
}

async function removeDeveloperFromTenant(developerEmail, tenantId) {
  const groupName = `tenant:${tenantId}`;
  const groups = await adminRequest('GET', `/groups?search=${encodeURIComponent(groupName)}`);
  const group = groups.find(g => g.name === groupName);
  if (!group) throw new Error(`Grupo no encontrado: ${groupName}`);

  const users = await adminRequest('GET', `/users?email=${encodeURIComponent(developerEmail)}&exact=true`);
  const user = users[0];
  if (!user) throw new Error(`Usuario no encontrado: ${developerEmail}`);

  await adminRequest('DELETE', `/users/${user.id}/groups/${group.id}`);
  console.log(`✓ ${developerEmail} removido de tenant:${tenantId}`);
}

async function listDeveloperTenants(developerEmail) {
  const users = await adminRequest('GET', `/users?email=${encodeURIComponent(developerEmail)}&exact=true`);
  const user = users[0];
  if (!user) throw new Error(`Usuario no encontrado: ${developerEmail}`);

  const groups = await adminRequest('GET', `/users/${user.id}/groups`);
  const tenants = groups
    .filter(g => g.name.startsWith('tenant:'))
    .map(g => g.name.replace('tenant:', ''));

  console.log(`Tenants de ${developerEmail}:`, tenants);
  return tenants;
}

const [,, cmd, ...args] = process.argv;

const commands = {
  'create-group':  () => createTenantGroup(args[0]),
  'add-dev':       () => addDeveloperToTenant(args[0], args[1]),
  'remove-dev':    () => removeDeveloperFromTenant(args[0], args[1]),
  'list-dev':      () => listDeveloperTenants(args[0]),
};

if (!commands[cmd]) {
  console.error('Comandos disponibles:');
  console.error('  node scripts/setup-groups.js create-group <tenantId>');
  console.error('  node scripts/setup-groups.js add-dev <email> <tenantId>');
  console.error('  node scripts/setup-groups.js remove-dev <email> <tenantId>');
  console.error('  node scripts/setup-groups.js list-dev <email>');
  process.exit(1);
}

commands[cmd]()
  .then(() => process.exit(0))
  .catch(err => { console.error(err.response?.data || err.message); process.exit(1); });
