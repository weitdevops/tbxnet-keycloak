# 📝 Minuta 27 Marzo 2026

## Avances

- Integración con Google OAuth

- Uso de JWT en lugar de API Keys

## Decisiones

- Validación con JWKS

- Rotación de tokens habilitada

## M2M

- Client Credentials

- Expiración recomendada

## Permisos

- Basados en scopes

- Uso de grupos

---

# 📝 Minuta 06 Abril 2026

## M2M

- Client Credentials Flow

- APIs:

  - Payments

  - Affiliates

## Seguridad

- Brute-force protection

- Logging habilitado

## Open Questions

### Tenant en JWT

- No usar `sub`

- Evaluar `tenant_id`

### IP Restriction

- Implementar en WAF

---

# 📝 Minuta 13 Abril 2026

## Contexto

- 309 afiliados

- Prioridad: backends externos

## Arquitectura

- IP fuera de Keycloak

- No modificar `sub`

## Tokens

- No persistidos

- Caching en cliente

## Modelo

- Audience = tenant

- Resource Access = APIs

- Scopes = permisos

---

# 🔗 Referencias

- https://www.keycloak.org/docs-api/latest/rest-api/index.html

- https://apisix.apache.org/

- https://github.com/auth0/node-jwks-rsa/