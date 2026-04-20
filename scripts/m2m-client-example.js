'use strict';

require('dotenv').config();
const axios = require('axios');

const ISSUER = process.env.KEYCLOAK_ISSUER_BASE_URL;

function createM2MClient(clientId, clientSecret) {
  let cachedToken = null;
  let expiresAt = 0;
  const BUFFER_SECONDS = 30;

  async function getToken() {
    if (cachedToken && Date.now() < expiresAt - BUFFER_SECONDS * 1000) {
      return cachedToken;
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await axios.post(
      `${ISSUER}/protocol/openid-connect/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    cachedToken = res.data.access_token;
    expiresAt = Date.now() + res.data.expires_in * 1000;
    console.log(`[token] Nuevo token obtenido, expira: ${new Date(expiresAt).toISOString()}`);
    return cachedToken;
  }

  async function callAPI(url) {
    const token = await getToken();
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  }

  return { getToken, callAPI };
}

// Demo: 3 llamadas seguidas, solo debe obtener 1 token
async function demo() {
  const clientId = process.env.TEST_PARTNER_CLIENT_ID;
  const clientSecret = process.env.TEST_PARTNER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Configurar TEST_PARTNER_CLIENT_ID y TEST_PARTNER_CLIENT_SECRET en .env');
    process.exit(1);
  }

  const client = createM2MClient(clientId, clientSecret);
  const API_BASE = `http://localhost:${process.env.PORT || 3000}`;

  for (let i = 1; i <= 3; i++) {
    console.log(`\n[llamada ${i}]`);
    const data = await client.callAPI(`${API_BASE}/affiliates`);
    console.log('Respuesta:', data);
  }

  console.log('\n✓ El mensaje "[token] Nuevo token obtenido" debe aparecer solo una vez');
}

module.exports = { createM2MClient };

if (require.main === module) {
  demo().catch(err => {
    console.error(err.response?.data || err.message);
    process.exit(1);
  });
}
