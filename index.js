'use strict';

require('dotenv').config();

const express = require('express');
const { buildAuth, requireRole, extractTenant } = require('./middleware/auth');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable de entorno: ${name}`);
  return value;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ISSUER_BASE_URL = requireEnv('KEYCLOAK_ISSUER_BASE_URL');

app.use(express.json());

const authenticate = buildAuth(ISSUER_BASE_URL);

app.get('/token-info', authenticate, extractTenant, (req, res) => {
  const p = req.auth.payload;
  res.json({
    tenant:          req.tenant,
    azp:             p.azp,
    email:           p.email || null,
    expires_at:      p.exp ? new Date(p.exp * 1000).toISOString() : null,
    resource_access: p.resource_access || {},
    scope:           p.scope || null,
  });
});

app.get('/affiliates',
  authenticate,
  extractTenant,
  requireRole('affiliates-api', 'affiliates:read'),
  (req, res) => res.json({ tenant: req.tenant, data: 'affiliates list' })
);

app.post('/affiliates',
  authenticate,
  extractTenant,
  requireRole('affiliates-api', 'affiliates:create'),
  (req, res) => res.json({ tenant: req.tenant, created: true })
);

app.get('/payments',
  authenticate,
  extractTenant,
  requireRole('cloudpay-api', 'payments:get'),
  (req, res) => res.json({ tenant: req.tenant, data: 'payments list' })
);

app.post('/payments',
  authenticate,
  extractTenant,
  requireRole('cloudpay-api', 'payments:create'),
  (req, res) => res.json({ tenant: req.tenant, created: true })
);

app.use((err, req, res, next) => {
  if (err.status === 401) {
    return res.status(401).json({ error: 'unauthorized', detail: err.message });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`Issuer: ${ISSUER_BASE_URL}`);
});
