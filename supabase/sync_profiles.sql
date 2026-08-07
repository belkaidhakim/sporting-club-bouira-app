-- Ajouter tous les comptes existants dans la table profiles (avec le rôle admin par défaut)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
