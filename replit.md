# Workspace

## Overview

pnpm workspace monorepo using TypeScript. The main product is a medical imaging research portal for cervical cancer clinical, imaging, statistics, and radiomics data management.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild for API, Vite for web

## Artifacts

- `artifacts/medical-portal`: React/Vite web UI at `/`
- `artifacts/api-server`: Express API at `/api`
- `artifacts/mockup-sandbox`: canvas component preview environment

## Database

The development PostgreSQL schema contains:

- `patients`
- `imaging_records`
- `radiomics_features`

The development database has anonymized sample records so dashboard, statistics, imaging, and radiomics views render immediately before real Excel imports are added.

## Server-Side PyRadiomics

PyRadiomics 3.0.1 is installed in `.pythonlibs` (Python 3.11). The extraction script lives at `artifacts/api-server/extract_radiomics.py`.

- `POST /api/radiomics/extract/:imagingId` — downloads NIfTI + Mask from object storage to `/tmp`, runs PyRadiomics, saves 107 features (7 feature classes) to `radiomics_features`, returns `{extracted, imagingId}`.
- The "提取特征" button appears in the imaging table for records that have both NIfTI and Mask files uploaded.
- Settings: binWidth=25, geometryTolerance=1e-3 (needed for 2021_108 geometry mismatch).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
