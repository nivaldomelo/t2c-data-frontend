# t2c-data-frontend

Frontend (SPA) da plataforma **t2c_data** — **Vite + React + TypeScript**, deploy em **S3 + CloudFront**
(padrão Turn2C `frontend-spa-cdn`). Consome a API do backend (`t2c-data-backend`) por URL configurável.

> Migração em andamento a partir do app Next.js do monorepo `t2c_data`. **F1 (scaffold) concluído**;
> as telas por módulo estão sendo portadas (App Router → React Router, remoção de Next-isms).

---

## 🚀 Deploy (DevOps) — variáveis de build

> **Leitura obrigatória antes do primeiro deploy.** Ambientes: **`develop` → dev**, **`main` → prd**
> (não há `apc` neste projeto). Frontend **não tem banco de dados nem migrações** — é um SPA estático
> em **S3 + CloudFront**. Toda persistência é via a API do `t2c-data-backend`.

As variáveis `VITE_*` são **assadas no build** (públicas — **NUNCA** coloque segredos). Definidas por
ambiente como **GitHub Environment vars** (`vars.VITE_*`); o pipeline gera o `.env.production` no build.

| Var | Exemplo | Nota |
|---|---|---|
| `VITE_API_URL` | `https://api.t2c-data.<dns>/api/v1` | URL **absoluta** da API. Precisa casar com `CORS_ALLOW_ORIGINS` do backend. Auth **Bearer**. |
| `VITE_APP_ENV` | `dev` \| `prd` | Ambiente lógico. |
| `VITE_APP_VERSION` | (opcional) | Versão exibida na UI. |

Infra que o DevOps provê: bucket `t2c-data-frontend-{env}` + distribuição CloudFront (`vars.CLOUDFRONT_ID`),
via terraform `t2c-tf-frontend`. Deploy: `build` → `aws s3 sync --delete` → invalidação de cache (HTML/root).
Ver [.env.example](.env.example) e a seção **Deploy** abaixo.

---

## Stack
- Vite 5, React 18, TypeScript, React Router 6
- @tanstack/react-query, react-i18next, tailwindcss, lucide-react, reactflow

## Rodar localmente
```bash
npm install
cp .env.example .env.local   # ajuste VITE_API_URL para o backend (ex.: http://localhost:8000/api/v1)
npm run dev                  # http://localhost:3000
```

## Build (estático)
```bash
npm run build     # tsc -b && vite build  -> dist/
npm run preview   # serve o dist/ localmente
```
O artefato de produção é a pasta **`dist/`**, publicada em S3 e servida por CloudFront (não há Dockerfile
nem Helm — frontends Turn2C não sobem em EKS).

## Variáveis de ambiente (build-time)
`VITE_*` são "assadas" no build (públicas — **nunca** segredos). Ver [.env.example](.env.example).
- `VITE_API_URL` — URL absoluta da API (ex.: `https://t2c-data-backend.<dns>/api/v1`). Auth via **Bearer**.
- `VITE_APP_ENV` — `dev|prd|apc`.

## Autenticação
O guard de rota (client-side) valida o token e envia `Authorization: Bearer <token>` à API; CORS no backend
libera o domínio do CloudFront. (Sem cookies cross-site.)

## Deploy (S3 + CloudFront)
Pipeline `.github/workflows/cicd.yaml` (`frontend-spa-cdn`): `build` (gera `.env.production` de `vars.VITE_*`,
`tsc -b`, `vite build`) → `s3Deploy` (`aws s3 sync --delete`, bucket `t2c-data-frontend-{env}`, cache headers
separados p/ `index.html`) → `invalidateCache` (`vars.CLOUDFRONT_ID`, apenas HTML/root).
Bucket/CloudFront provisionados via terraform `t2c-tf-frontend` (DevOps).

## Segurança (frontend)
- **CSP**: o `index.html` já traz um baseline não-quebrável (`object-src 'none'`, `base-uri 'self'`,
  `frame-ancestors 'none'`). A **CSP completa** deve ser aplicada como header no **CloudFront** (Response
  Headers Policy), travando `script-src`/`connect-src` no domínio da API. Exemplo:
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self' data:;
  connect-src 'self' https://api.t2c-data.<dns>;   # domínio real da API
  object-src 'none'; base-uri 'self'; frame-ancestors 'none';
  ```
  (Se o build usar o polyfill de modulepreload do Vite, adicione o hash do script inline ou um nonce.)
- **Token**: hoje o JWT fica em `localStorage` (auth **Bearer**, sem cookies cross-site). Mitigação
  primária = CSP acima (bloqueia exfiltração via XSS). Evolução recomendada: mover a sessão para cookie
  `HttpOnly; Secure; SameSite` emitido pelo backend.
- **Links dinâmicos**: URLs vindas da API passam por `safeHref()` (`src/lib/safe-href.ts`) antes de ir
  para `<a href>`/`window.location` — bloqueia `javascript:`/open-redirect.

## Testes
```bash
npm run typecheck   # tsc -b
npm test            # vitest
```
