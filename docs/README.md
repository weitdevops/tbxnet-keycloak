# 🔐 Configuración de Keycloak

Este documento detalla la configuración esencial de Keycloak, incluyendo:

- Integración con proveedores de identidad externos (Google)

- Gestión de Clients y Client Scopes

- Creación de usuarios locales

- Flujos de autenticación (PKCE, M2M, Token Exchange)

- Modelo de permisos (roles, scopes y audiencias)

- Observabilidad y auditoría

---

## ⚙️ Configuración Inicial

Antes de iniciar Keycloak, habilitar features avanzadas:

### Opción 1: keycloak.conf

```

features=admin-fine-grained-authz,scripts

```

### Opción 2: Variable de entorno

```

KC_FEATURES=admin-fine-grained-authz,scripts

```

---

## 🔧 Creación de Admin Manager

1. Ir a **Clients → Create**

2. Client ID: `tbx-admin`

3. Activar:

   - Client Authentication

   - Service Accounts Roles

4. Ir a **Credentials** → copiar secret

5. En **Service account roles** → asignar rol `admin`

---

## 🌐 Integración con Google (IdP)

### Configuración en Google Cloud

1. Crear proyecto

2. Habilitar APIs necesarias

3. Crear OAuth Client ID (tipo Web)

4. Configurar:

```

https://[keycloak-url]/realms/[realm]/broker/google/endpoint

```

---

### Configuración en Keycloak

1. Identity Providers → Google

2. Configurar:

| Campo | Valor |

|------|------|

| Alias | google |

| Client ID | (Google) |

| Client Secret | (Google) |

| Default Scopes | openid email profile |

---

## 🧩 Gestión de Clients

### Crear Client

| Campo | Valor |

|------|------|

| Client ID | public |

| Root URL | https://public.tbxnet.com |

| Redirect URIs | https://public.tbxnet.com/* |

| Authentication Flow | Standard Flow |

---

## 🎯 Client Scopes

### Crear Scope

- Name: `admin-access`

- Protocol: `openid-connect`

---

### Mapper del Scope

| Campo | Valor |

|------|------|

| Mapper Type | Hardcoded Role |

| Role Name | admin |

| Token Claim Name | roles |

---

### Asignación del Scope

- Default Client Scopes → siempre incluido

- Optional Client Scopes → bajo demanda

---

## 👤 Usuarios Locales

1. Users → Add user

2. Username: `usuario-dev`

3. Definir credenciales

4. Asignar rol `admin`

---

## 🔐 Authorization Code + PKCE

Flujo para autenticación de usuarios.

### Ejemplo JWT

```json

{

  "aud": "developer-public",

  "scope": "openid admin-access",

  "azp": "public",

  "preferred_username": "usuario-dev"

}

```

---

## 🔑 Validación JWT (JWKS)

### Flujo

1. Leer `kid`

2. Consultar JWKS

3. Obtener clave pública

4. Validar firma

### Endpoint

```

/realms/{realm}/protocol/openid-connect/certs

```

---

## 🤖 Client Credentials (M2M)

### Configuración

1. Crear client: `core-backend`

2. Activar:

   - Client Authentication

   - Service Accounts

---

### Request

```

grant_type=client_credentials

client_id=core-backend

client_secret=xxxx

```

---

### Respuesta

```json

{

  "access_token": "...",

  "expires_in": 7200,

  "scope": "profile email"

}

```

---

## 🔀 Token Exchange

Permite intercambiar tokens entre servicios.

### Conceptos

- subject_token → token original

- requesting client → quien solicita

- issued token → nuevo token

---

### Configuración

1. Client → habilitar:

   - Standard Token Exchange

---

### Request

```

grant_type=urn:ietf:params:oauth:grant-type:token-exchange

subject_token={token}

audience=direct-tv

```

---

## 📊 Observabilidad

### User Events

- Activar: Save Events

- Configurar expiración

### Admin Events

- Activar auditoría

- Habilitar "Include Representation"

---

## 🧠 Modelo de Seguridad

### Scopes

Permisos granulares:

```

payments:create

wallet:read

payments:refund

```

---

### Roles

Agrupan permisos:

```

admin

operator

devops

```

---

### Audiencia (aud)

Define el servicio destino:

```

cloudpay-api

affiliate-api

developer-public

```

---

## 🧩 Relación entre conceptos

| Concepto | Función |

|---------|--------|

| Scope | Permiso |

| Role | Agrupador |

| Audience | API destino |

---