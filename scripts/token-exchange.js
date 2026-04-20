'use strict';

require('dotenv').config();
const axios = require('axios');

const ISSUER = process.env.KEYCLOAK_ISSUER_BASE_URL;
const CLIENT_ID = 'developer-portal';
const CLIENT_SECRET = process.env.DEVELOPER_PORTAL_SECRET;

async function tokenExchange(subjectToken, targetAudience) {
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    subject_token: subjectToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    audience: targetAudience,
  });

  const res = await axios.post(
    `${ISSUER}/protocol/openid-connect/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const newToken = res.data.access_token;
  const [, payload] = newToken.split('.');
  const p = JSON.parse(Buffer.from(payload, 'base64url').toString());

  console.log('=== Token Exchange exitoso ===');
  console.log(`aud:             ${p.aud}`);
  console.log(`azp:             ${p.azp}`);
  console.log(`email:           ${p.email || '(no presente)'}`);
  console.log(`exp:             ${new Date(p.exp * 1000).toISOString()}`);
  console.log(`resource_access: ${JSON.stringify(p.resource_access ?? {}, null, 2)}`);
  console.log('\naccess_token:', newToken);

  return newToken;
}

const [,, subjectToken, targetAudience] = process.argv;

if (!subjectToken || !targetAudience) {
  console.error('Uso: node scripts/token-exchange.js <subjectToken> <targetAudience>');
  console.error('Ejemplo: node scripts/token-exchange.js eyJhbGc... direct-tv');
  console.error('');
  console.error('Cómo obtener el subjectToken:');
  console.error('  1. Ir al Developer Portal o usar Postman con Authorization Code + Google');
  console.error('  2. Configurar redirect_uri y copiar el access_token del response');
  process.exit(1);
}

tokenExchange(subjectToken, targetAudience)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Token Exchange fallido:');
    console.error(err.response?.data || err.message);
    if (err.response?.status === 403) {
      console.error('\nPosibles causas:');
      console.error('  - El developer no pertenece al grupo "tenant:' + targetAudience + '"');
      console.error('  - Token Exchange no está habilitado en el realm');
      console.error('  - Falta la política de autorización en developer-portal');
    }
    process.exit(1);
  });
