# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SelOrder is a multi-tenant B2B ordering portal (articles/stock, orders, user profile). Three independent projects, no shared solution:

- `selorder-server/` — ASP.NET Core Minimal API (.NET 11, `net11.0-windows`), EF Core + SQL Server, JWT auth, Resend for e-mail.
- `selorder-client/` — React 19 + TypeScript + Vite SPA, `react-router` v8, axios.
- `selorder-integration/` — .NET 11 console job (Dapper + DeepL) that fills missing article translations directly in the DB. Intended to grow into ERP sync jobs.
- `database.sql` — full SQL Server schema script. There are **no EF migrations**; schema changes go into the DB/this script and the entities in `selorder-server/Entities/` are kept in sync by hand.

Code comments, log messages and API messages are in Polish; keep that convention.

## Commands

Server (listens on `http://0.0.0.0:5000`, hard-coded in `app.Run` — `launchSettings.json` ports are ignored):

```bash
cd selorder-server && dotnet run
cd selorder-server && dotnet build
```

Client (dev server on :5173, proxies `/api` → `http://localhost:5000`):

```bash
cd selorder-client && npm install
cd selorder-client && npm run dev
cd selorder-client && npm run build   # tsc -b + vite build (this is the type-check)
cd selorder-client && npm run lint
```

Integration job (needs `ConnectionStrings:DefaultConnection` and `DeepL:ApiKey` in its `appsettings.Local.json`):

```bash
cd selorder-integration/selorder-integration && dotnet run
```

There is no automated test suite. Manual API requests live in `selorder-server/testy/testy.http`.

## Server architecture

- **Everything is wired in `Program.cs`**: DI registrations and all endpoints (`app.MapGet/MapPost/MapPut`). There are no controllers. New endpoints go here and delegate to a service in `Services/`; services take `AppDbContext` and `IAppUserContext` via primary constructors and return DTOs from `DTOs/` (records).
- **Tenant isolation**: `IAppUserContext` (`Services/Auth.cs`) reads `TenantId`, `UserId` (NameIdentifier) and `Language` claims from the JWT. `AppDbContext` captures the TenantId at construction and applies global query filters on `Order` and `User`; entities implementing `ITenantAware` get `TenantId` stamped on insert in `SaveChanges`. When the request is anonymous, TenantId is null and the filters are **disabled** (that is how `/api/login` finds users) — keep this in mind for any new anonymous endpoint. Articles/Units are global (not tenant-filtered).
- **Dates**: all date columns are `datetimeoffset` stored in UTC (+00:00; DB defaults use `sysutcdatetime()`), mapped to `DateTimeOffset` and set with `DateTimeOffset.UtcNow`. JSON carries the offset, so the client converts to local time. When inserting by hand use `SYSUTCDATETIME()`, never `GETDATE()`/`SYSDATETIME()`. The year in order numbers is taken in `Europe/Warsaw` time.
- **Language resolution** (`AppUserContext.LanguageCode`): `Accept-Language` header (first 2 chars, uppercased) → JWT `Language` claim → `"PL"`. Supported: PL, EN, DE, RU.
- **Translated data pattern**: entity tables have companion `*Translations` tables (`ArticlesTranslations`, `UnitTranslations`); services project with a subquery `Translations.Where(t => t.LanguageCode == lang).Select(t => t.Name).FirstOrDefault() ?? <fallback name>` (see `ArticleService`). UI strings come from `AppTranslations` via `TranslationService`, cached in `HybridCache` under `app-dict-{lang}` with tag `translations`.
- **Paged list endpoints** (`/api/articles`, `/api/orders`): `page` and `pageSize` query params are taken out, every other query param becomes a filter passed to `QueryableExtensions.ApplyDynamicFilters`, which matches a property name case-insensitively and applies `string.Contains` (string properties only; unknown keys are ignored). Results are wrapped in `PagedResult<T>`; `pageSize <= 0` disables paging.
- **Login**: `/api/login` matches the identifier against `Users.Login`, then `Users.Email` (DB collation `Polish_CI_AS`, so case-insensitive). Email is unique (`UQ_Users_Email`, filtered on NOT NULL) and `UserService.UpdateCurrentUserProfileAsync` returns false on a duplicate. Only BCrypt hashes (`$2…`) are accepted; plain-text passwords are rejected. Inactive users or inactive tenants get the same 401 as bad credentials (checked after the password) and cannot reset passwords.
- Config: secrets (`ConnectionStrings:DefaultConnection`, `JwtSettings:SecretKey` — startup throws if missing, `Resend:ApiToken`; in the integration job `DeepL:ApiKey`) live in a gitignored `appsettings.Local.json` next to `appsettings.json`, which keeps empty placeholders. Never put real secrets in `appsettings.json` — a Resend key leaked that way. The forgot-password endpoint hard-codes the frontend URL `http://localhost:5173`.

## Client architecture

- `src/api/client.ts` — the single axios instance (`apiClient`). Uses relative URLs (relies on the Vite proxy), attaches `Bearer` token from `localStorage`, and on 401 clears auth keys and dispatches a `window` event `auth-unauthorized` that `App.tsx` listens to for logout. Always use `apiClient`, not raw axios/fetch.
- Auth state lives in `App.tsx` (no router guards/library): `localStorage` keys `token`, `login`, `tenantId`, `language`. Unauthenticated users get a separate `<Routes>` tree (login / forgot / reset password).
- `src/common/context/TranslationContext.tsx` — `useTranslations()` gives `t(key, fallback)`, `language`, `changeLanguage`. Changing language sets the axios `Accept-Language` default header (which drives server-side data translation) and refetches `/api/translations`. All UI text should go through `t('Area.Key', 'Polish fallback')`.
- `src/common/` holds app-agnostic pieces (layout, `DataGrid`, auth/profile pages); `src/pages/` holds domain pages. `DataGrid` is the generic table with optional column filters + pagination whose filter keys map directly to the server's dynamic filter query params (i.e. DTO property names).

## Repo notes

- `*.bak` files and `selorder-client/src.zip` are local backups (`.bak` is gitignored); ignore them when reading code.
