# Unity Cricket Academy Management

Production-ready Angular 17 + Supabase academy management system. There is no .NET, Node, Express, or separate API backend; the app talks directly to Supabase with the client SDK.

## Setup

1. Create a new Supabase project.
2. Open Supabase SQL Editor, paste `supabase/schema.sql`, and run it.
3. In Authentication > Sign In / Providers, keep Email enabled. For immediate coach login after admin-created coach accounts, disable email confirmation; otherwise the coach must confirm email before signing in.
4. Update `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

5. Install and run:

```bash
npm install
npm start
```

Create the default admin in Supabase Dashboard > Authentication > Users:

```text
admin@cricketacademy.com
Admin@123
```

After creating that user, run:

```sql
-- Same SQL is available in supabase/link-admin-profile.sql
insert into public.profiles (id, name, email, role)
select id, 'Unity Admin', email, 'Admin'
from auth.users
where email = 'admin@cricketacademy.com'
on conflict (id) do update
set name = excluded.name,
    email = excluded.email,
    role = excluded.role;
```

## Required Packages

Core packages are already declared in `package.json`:

- Angular 17 standalone app packages
- `@supabase/supabase-js`
- `tailwindcss`, `postcss`, `autoprefixer`

## Features

- Supabase Auth with session persistence
- Admin and Coach roles in `profiles`
- Role-based sidebar and route guards
- Dashboard statistics
- Student CRUD, search, filters, details, active toggle, admin-only delete
- Coach CRUD with Supabase Auth signup; the RPC only links the created auth user to `profiles` and `coaches`
- Batch cards with popup details
- Bulk student attendance and admin coach attendance
- Fee entry and payment history
- Salary generation with 2 free leaves and automatic deduction
- Typed reusable services, confirmation modal, global loading spinner
- Responsive Tailwind UI with black, red, and orange branding

## Vercel Deployment

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Use these settings:
   - Framework Preset: `Angular`
   - Build command: `npm run build`
   - Output directory: `dist/unity-cricket-academy-management/browser`
4. Make sure `src/environments/environment.prod.ts` contains your Supabase URL and anon key before deploying.
5. In Supabase Dashboard > Authentication > URL Configuration:
   - Site URL: your Vercel deployed URL, for example `https://your-app.vercel.app`
   - Redirect URLs: add your Vercel deployed URL and `http://localhost:4200`
6. Deploy.

`vercel.json` includes the SPA rewrite needed for Angular routing and page refreshes.

## Project Structure

```text
src/app/
  auth/
  core/
  guards/
  layout/
  models/
  pages/
  services/
  shared/
src/assets/logo.png
src/environments/
supabase/schema.sql
supabase/migrations/20260512_fix_academy_modules.sql
supabase/link-admin-profile.sql
```
