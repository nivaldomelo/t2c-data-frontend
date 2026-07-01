# t2c-data-frontend

Frontend (SPA) da plataforma **t2c_data** — **Vite + React + TypeScript**, deploy em **S3 + CloudFront**
(padrão Turn2C `frontend-spa-cdn`). Consome a API do backend (`t2c-data-backend`) por URL configurável.

> Migração em andamento a partir do app Next.js do monorepo `t2c_data`. **F1 (scaffold) concluído**;
> as telas por módulo estão sendo portadas (App Router → React Router, remoção de Next-isms).

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

## Testes
```bash
npm run typecheck   # tsc -b
npm test            # vitest
```
