# 🛡️ Production Reverse Proxy Guide (Nginx & Cloudflare)

This guide documents the enterprise-grade **Unified Gateway / Reverse Proxy** pattern for deploying **AngkorGate** under a single public domain (e.g., `https://oauthv1.angkorgate.com`).

By adopting this architecture, your core backend (`angkorgate-core`) stays **100% internal and shielded** inside a private Docker bridge network. Only the reverse proxy listens to the outside world.

---

## 📐 Architecture Overview

```mermaid
flowchart TD
    User["Public Internet / Browser / OIDC Client"] -->|HTTPS (Port 443)| CF["Cloudflare Edge (WAF / SSL / CDN)"]
    CF -->|Encrypted HTTPS| Nginx["Nginx Reverse Proxy Gateway"]

    subgraph Docker Internal Network (angkorgate-net)
        Nginx -->|"Proxy /oidc/*, /api/*, /.well-known/*"| Core["angkorgate-core:8080 (Internal Only)"]
        Nginx -->|"Proxy /* (UI, SSR, Static Assets)"| Console["angkorgate-console:3000 (Internal Only)"]
        
        Core <--> Redis["Redis (Internal Port 6379)"]
        Core <--> DB["PostgreSQL (Internal Port 5432)"]
    end
```

### Why this is the Best Solution
1. **Zero Direct Attack Surface:** Neither PostgreSQL, Redis, nor NestJS backend ports are exposed directly to the public internet.
2. **Zero CORS Friction:** Frontend and backend share the identical origin (`https://oauthv1.angkorgate.com`), removing cross-origin preflight checks and third-party cookie restrictions.
3. **OIDC Standard Compliance:** OpenID Connect requires the `issuer` URL to match the exact URL contacted by client applications. The reverse proxy preserves full compliance.

---

## 🐳 Step 1: Docker Compose Setup

In production, remove host port mappings from all internal services. Use Docker's internal networking so containers communicate by service name.

### `docker-compose.prod.yaml`
```yaml
version: '3.8'

networks:
  angkorgate-net:
    driver: bridge

services:
  # 1. Edge Reverse Proxy (Only service with public ports)
  angkorgate-proxy:
    image: nginx:alpine
    container_name: angkorgate-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/ssl:ro
    networks:
      - angkorgate-net
    depends_on:
      - angkorgate-core
      - angkorgate-console

  # 2. Database (Private)
  angkorgate-db:
    image: postgres:16-alpine
    container_name: angkorgate-db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - angkorgate-net
    # Note: NO ports section here (strictly internal)

  # 3. Redis Cache & Distributed Store (Private)
  angkorgate-redis:
    image: redis:7-alpine
    container_name: angkorgate-redis
    restart: always
    networks:
      - angkorgate-net
    # Note: NO ports section here (strictly internal)

  # 4. Core IAM & OIDC Provider (Private)
  angkorgate-core:
    build:
      context: ./angkorgate-core
      dockerfile: Dockerfile
    container_name: angkorgate-core
    restart: always
    environment:
      - PORT=8080
      - DB_HOST=angkorgate-db
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - APP_WEB_URL=https://oauthv1.angkorgate.com
      - OIDC_ISSUER=https://oauthv1.angkorgate.com/oidc
      - REDIS_ENABLED=true
      - REDIS_HOST=angkorgate-redis
      - REDIS_PORT=6379
    expose:
      - "8080" # Exposed only within angkorgate-net
    networks:
      - angkorgate-net
    depends_on:
      - angkorgate-db
      - angkorgate-redis

  # 5. Next.js Console & Login UI (Private)
  angkorgate-console:
    build:
      context: ./angkorgate-console
      dockerfile: Dockerfile
    container_name: angkorgate-console
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_CORE_API_URL=https://oauthv1.angkorgate.com
      - INTERNAL_CORE_API_URL=http://angkorgate-core:8080
    expose:
      - "3000" # Exposed only within angkorgate-net
    networks:
      - angkorgate-net
    depends_on:
      - angkorgate-core

volumes:
  db-data:
```

---

## ⚙️ Step 2: Nginx Configuration

Create `nginx/nginx.conf` in your workspace. This configuration handles SSL, passes crucial `X-Forwarded-*` headers needed by `oidc-provider`, and splits traffic between UI and API.

### `nginx/nginx.conf`
```nginx
upstream core_backend {
    server angkorgate-core:8080;
    keepalive 32;
}

upstream console_frontend {
    server angkorgate-console:3000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name oauthv1.angkorgate.com;

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name oauthv1.angkorgate.com;

    # SSL Certificates (Cloudflare Origin CA or Let's Encrypt)
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 1. OIDC Discovery & Protocol Routes -> angkorgate-core
    location /oidc/ {
        proxy_pass http://core_backend;
        
        # Essential Headers for oidc-provider (proxy: true)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Disable buffering for auth redirects
        proxy_buffering off;
        proxy_read_timeout 90;
    }

    # 2. REST API Endpoints -> angkorgate-core
    location /api/ {
        proxy_pass http://core_backend;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }

    # 3. Well-Known OpenID Configuration Fallback -> angkorgate-core
    location /.well-known/ {
        proxy_pass http://core_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Next.js Console & UI -> angkorgate-console
    location / {
        proxy_pass http://console_frontend;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # WebSockets for Next.js Fast Refresh & Client Subscriptions
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## ☁️ Step 3: Cloudflare Setup (Zero-Downtime & Strict Security)

When using Cloudflare in front of Nginx:

### 1. DNS Settings
- Create an **A Record** pointing to your server's Public IP:
  - **Type:** `A`
  - **Name:** `oauthv1` (or `@` if apex domain)
  - **Content:** `<YOUR_VPS_PUBLIC_IP>`
  - **Proxy status:** **Proxied (Orange Cloud ON)**

### 2. SSL/TLS Encryption Mode
- Go to **SSL/TLS** in Cloudflare Dashboard:
- Select **Full (Strict)**.
  > [!IMPORTANT]
  > Do not use "Flexible". Flexible mode will cause redirect loops (`ERR_TOO_MANY_REDIRECTS`) because OIDC requires secure HTTPS transport and sets secure cookies.

### 3. Generate a Free 15-Year Origin Certificate
- In Cloudflare, navigate to **SSL/TLS > Origin Server**.
- Click **Create Certificate**.
- Keep defaults (RSA 2048, Hostnames: `*.angkorgate.com`, `angkorgate.com`).
- Copy the **Origin Certificate** and save as `./certs/cert.pem`.
- Copy the **Private Key** and save as `./certs/key.pem`.
- Run: `chmod 600 ./certs/key.pem`.

---

## 🔒 Crucial OIDC Notes & Settings

### 1. Reverse Proxy Trust (`proxy = true`)
`angkorgate-core` already has `this.oidc.proxy = true;` configured in `src/oidc/services/oidc.service.ts`.
This ensures that `oidc-provider` respects:
- `X-Forwarded-Proto: https` (ensures cookies are issued with `Secure` flag)
- `X-Forwarded-Host: oauthv1.angkorgate.com`
- Client IP addresses for rate limiting and audit logging.

### 2. Environment Variables Checklist
Make sure your production `.env` contains:
```env
# Must match your public HTTPS domain
OIDC_ISSUER=https://oauthv1.angkorgate.com/oidc
APP_WEB_URL=https://oauthv1.angkorgate.com
NEXT_PUBLIC_CORE_API_URL=https://oauthv1.angkorgate.com
```

---

## 🧪 Verification & Testing with OIDC Debugger

Once deployed, you can verify your configuration with [OIDC Debugger](https://oidcdebugger.com):

| Field | Production Value |
| :--- | :--- |
| **Authorize URI** | `https://oauthv1.angkorgate.com/oidc/auth` |
| **Token URI** | `https://oauthv1.angkorgate.com/oidc/token` |
| **Discovery URL** | `https://oauthv1.angkorgate.com/oidc/.well-known/openid-configuration` |
| **JWKS URI** | `https://oauthv1.angkorgate.com/oidc/jwks` |
| **Redirect URI** | `https://oidcdebugger.com/debug` |
| **Response Type** | `code` |

### Terminal Verification
You can also run these curl commands to verify your gateway is operating properly:

```bash
# 1. Verify Discovery Endpoint
curl -s https://oauthv1.angkorgate.com/oidc/.well-known/openid-configuration | jq .issuer
# Expected output: "https://oauthv1.angkorgate.com/oidc"

# 2. Verify JWKS Endpoint
curl -s https://oauthv1.angkorgate.com/oidc/jwks | jq .keys
# Expected output: Array of public RSA keys

# 3. Verify Next.js Frontend
curl -I https://oauthv1.angkorgate.com/login
# Expected output: HTTP/2 200 OK
```
