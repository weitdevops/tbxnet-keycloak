require('dotenv').config();

const express = require('express');
const { auth, requiredScopes, InsufficientScopeError } = require('express-oauth2-jwt-bearer');

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }

  return value;
}

function formatTokenExpiration(exp) {
  if (!exp) {
    return null;
  }

  return new Date(exp * 1000).toISOString();
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ISSUER_BASE_URL = requireEnv('KEYCLOAK_ISSUER_BASE_URL');
const AUDIENCE = requireEnv('KEYCLOAK_AUDIENCE');

app.use(express.json());

const validateToken = auth({
  issuerBaseURL: ISSUER_BASE_URL,
  audience: AUDIENCE,
});

app.get('/token-info', validateToken, (req, res) => {
  const p = req.auth.payload;

  res.json({
    audience:  p.aud,
    scope:     p.scope,
    tenant_id: p.tenant_id,
    client_id: p.client_id || p.azp,
    expires_at: formatTokenExpiration(p.exp),
    expires_at_unix: p.exp || null,
  });
});

// Solo pasa si el token tiene affiliates:read
app.get('/affiliates', validateToken, requiredScopes('affiliates:read'), (req, res) => {
  res.json({ data: 'success' });
});

// Solo pasa si tiene affiliates:create
app.post('/affiliates', validateToken, requiredScopes('affiliates:create'), (req, res) => {
  res.json({ created: true });
});

app.use((err, req, res, next) => {
  if (err.status === 401) {
    return res.status(401).json({ error: 'Token inválido o ausente', detail: err.message });
  }

  if (err instanceof InsufficientScopeError) {
    return res.status(403).json({
      error: 'insufficient_scope',
      message: 'No tenés permisos para acceder a este recurso',
      required: err?.requiredScopes || [],
      path: req.originalUrl,
    });
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`Corriendo en http://localhost:${PORT}`);
  console.log(`Issuer: ${ISSUER_BASE_URL}`);
  console.log(`Audience: ${AUDIENCE}`);
});
