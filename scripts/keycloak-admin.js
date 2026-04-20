'use strict';

require('dotenv').config();
const axios = require('axios');

const BASE = process.env.KEYCLOAK_ADMIN_URL;
const REALM = process.env.KEYCLOAK_REALM;
const CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
const CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

let _token = null;
let _tokenExp = 0;

async function getAdminToken() {
  if (_token && Date.now() < _tokenExp - 10000) return _token;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await axios.post(
    `${BASE}/realms/master/protocol/openid-connect/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  _token = res.data.access_token;
  _tokenExp = Date.now() + res.data.expires_in * 1000;
  return _token;
}

async function adminRequest(method, path, data) {
  const token = await getAdminToken();
  const res = await axios({
    method,
    url: `${BASE}/admin/realms/${REALM}${path}`,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  return res.data;
}

module.exports = { adminRequest };
