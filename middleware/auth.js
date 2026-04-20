'use strict';

const { auth } = require('express-oauth2-jwt-bearer');

function buildAuth(issuerBaseURL) {
  return auth({
    issuerBaseURL,
    audience: (req) => {
      const aud = req.auth?.payload?.aud;
      return Array.isArray(aud) ? aud[0] : aud;
    },
  });
}

function requireRole(api, role) {
  return (req, res, next) => {
    const roles = req.auth?.payload?.resource_access?.[api]?.roles ?? [];
    if (!roles.includes(role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Requiere rol "${role}" en "${api}"`,
        required_role: role,
        api,
      });
    }
    next();
  };
}

function extractTenant(req, res, next) {
  const aud = req.auth?.payload?.aud;
  req.tenant = Array.isArray(aud) ? aud[0] : aud;
  next();
}

module.exports = { buildAuth, requireRole, extractTenant };
