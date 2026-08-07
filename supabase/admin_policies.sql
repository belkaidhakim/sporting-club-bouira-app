-- Politiques d'administration pour la table profiles
-- On s'assure que la table a bien le RLS d'activé
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Les administrateurs peuvent VOIR tous les profils
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Les administrateurs peuvent MODIFIER les rôles des autres
DROP POLICY IF EXISTS "Admins can update roles" ON public.profiles;
CREATE POLICY "Admins can update roles" 
ON public.profiles FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
