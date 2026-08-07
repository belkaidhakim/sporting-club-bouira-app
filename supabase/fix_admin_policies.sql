-- 1. Création d'une fonction sécurisée pour lire le rôle sans créer de boucle infinie
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Mise à jour de la politique de LECTURE
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING ( public.get_user_role() = 'admin' );

-- 3. Mise à jour de la politique de MODIFICATION
DROP POLICY IF EXISTS "Admins can update roles" ON public.profiles;
CREATE POLICY "Admins can update roles" 
ON public.profiles FOR UPDATE 
USING ( public.get_user_role() = 'admin' )
WITH CHECK ( public.get_user_role() = 'admin' );
