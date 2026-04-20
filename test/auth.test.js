'use strict';

// Tests de integración — requieren servidor corriendo y credenciales en .env
// Correr con: npm test (asegurarse que `npm run dev` esté activo en otra terminal)

require('dotenv').config();

const { test, before, describe } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const API_BASE = `http://localhost:${process.env.PORT || 3000}`;
const ISSUER = process.env.KEYCLOAK_ISSUER_BASE_URL;
const PARTNER_ID = process.env.TEST_PARTNER_CLIENT_ID;
const PARTNER_SECRET = process.env.TEST_PARTNER_CLIENT_SECRET;

let partnerToken;

before(async () => {
  if (!PARTNER_ID || !PARTNER_SECRET) {
    throw new Error('Configurar TEST_PARTNER_CLIENT_ID y TEST_PARTNER_CLIENT_SECRET en .env');
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: PARTNER_ID,
    client_secret: PARTNER_SECRET,
  });

  const res = await axios.post(
    `${ISSUER}/protocol/openid-connect/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  partnerToken = res.data.access_token;
});

describe('GET /token-info', () => {
  test('retorna tenant, azp y resource_access del token', async () => {
    const res = await axios.get(`${API_BASE}/token-info`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.tenant, PARTNER_ID);
    assert.equal(res.data.azp, PARTNER_ID);
    assert.ok(res.data.resource_access, 'resource_access debe estar presente');
    assert.ok(res.data.expires_at, 'expires_at debe estar presente');
  });

  test('retorna 401 sin token', async () => {
    await assert.rejects(
      () => axios.get(`${API_BASE}/token-info`),
      (err) => {
        assert.equal(err.response.status, 401);
        return true;
      }
    );
  });
});

describe('GET /affiliates', () => {
  test('permite acceso con rol affiliates:read', async () => {
    const res = await axios.get(`${API_BASE}/affiliates`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.tenant, PARTNER_ID);
  });

  test('retorna 401 sin token', async () => {
    await assert.rejects(
      () => axios.get(`${API_BASE}/affiliates`),
      (err) => {
        assert.equal(err.response.status, 401);
        return true;
      }
    );
  });

  test('retorna 401 con token malformado', async () => {
    await assert.rejects(
      () => axios.get(`${API_BASE}/affiliates`, {
        headers: { Authorization: 'Bearer token.invalido.aqui' },
      }),
      (err) => {
        assert.equal(err.response.status, 401);
        return true;
      }
    );
  });
});

describe('POST /affiliates', () => {
  test('retorna 403 si el token no tiene affiliates:create', async () => {
    // Este test pasa si el partner de test solo tiene affiliates:read
    // Si el partner tiene affiliates:create, el test esperará 200 y fallará — ajustar en ese caso
    const [, payload] = partnerToken.split('.');
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const roles = p.resource_access?.['affiliates-api']?.roles ?? [];

    if (roles.includes('affiliates:create')) {
      // Partner tiene el rol — verificar que la creación funciona
      const res = await axios.post(`${API_BASE}/affiliates`, {}, {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      assert.equal(res.status, 200);
    } else {
      // Partner no tiene el rol — verificar que recibe 403
      await assert.rejects(
        () => axios.post(`${API_BASE}/affiliates`, {}, {
          headers: { Authorization: `Bearer ${partnerToken}` },
        }),
        (err) => {
          assert.equal(err.response.status, 403);
          assert.equal(err.response.data.error, 'forbidden');
          return true;
        }
      );
    }
  });
});

describe('GET /payments', () => {
  test('retorna 403 si el token no tiene payments:get en cloudpay-api', async () => {
    const [, payload] = partnerToken.split('.');
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const roles = p.resource_access?.['cloudpay-api']?.roles ?? [];

    if (roles.includes('payments:get')) {
      const res = await axios.get(`${API_BASE}/payments`, {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      assert.equal(res.status, 200);
    } else {
      await assert.rejects(
        () => axios.get(`${API_BASE}/payments`, {
          headers: { Authorization: `Bearer ${partnerToken}` },
        }),
        (err) => {
          assert.equal(err.response.status, 403);
          return true;
        }
      );
    }
  });
});
