-- Create admin@cricketacademy.com from Supabase Dashboard > Authentication > Users first.
-- Then run this to link that auth user to the academy Admin role.

insert into public.profiles (id, name, email, role)
select id, 'Unity Admin', email, 'Admin'
from auth.users
where email = 'admin@cricketacademy.com'
on conflict (id) do update
set name = excluded.name,
    email = excluded.email,
    role = excluded.role;
