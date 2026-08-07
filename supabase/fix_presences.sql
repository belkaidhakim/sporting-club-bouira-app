-- Forcer les permissions sur la table presences pour être sûr à 100%
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes règles qui pourraient bloquer
DROP POLICY IF EXISTS "Allow all actions on presences" ON public.presences;
DROP POLICY IF EXISTS "Allow anon insert on presences" ON public.presences;

-- 1. Autoriser TOUT LE MONDE (même non connecté) à insérer une présence
CREATE POLICY "policy_insert_presences" 
ON public.presences FOR INSERT 
WITH CHECK (true);

-- 2. Autoriser TOUT LE MONDE à lire l'historique des présences
CREATE POLICY "policy_select_presences" 
ON public.presences FOR SELECT 
USING (true);
