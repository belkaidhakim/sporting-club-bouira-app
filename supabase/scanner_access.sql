-- Autoriser la lecture publique (anon) pour le Scanner
-- La page /scanner n'exige pas de connexion (c'est souvent ouvert sur une tablette à l'entrée)
-- Nous devons donc autoriser le rôle 'anon' (anonyme) à faire un SELECT

-- 1. Athlètes (Lecture seule pour scanner)
DROP POLICY IF EXISTS "Allow anon select for scanner on athletes" ON public.athletes;
CREATE POLICY "Allow anon select for scanner on athletes" 
ON public.athletes FOR SELECT 
USING (true); -- true = accessible à tous (anon et authenticated)

-- 2. Cartes d'accès (Lecture seule pour vérifier la validité)
DROP POLICY IF EXISTS "Allow anon select for scanner on cartes_acces" ON public.cartes_acces;
CREATE POLICY "Allow anon select for scanner on cartes_acces" 
ON public.cartes_acces FOR SELECT 
USING (true);

-- 3. Cotisations (Lecture seule pour afficher la date de fin sur le badge du scanner)
DROP POLICY IF EXISTS "Allow anon select for scanner on cotisations" ON public.cotisations;
CREATE POLICY "Allow anon select for scanner on cotisations" 
ON public.cotisations FOR SELECT 
USING (true);

-- 4. Assurons-nous que le rôle anon peut aussi INSERER des présences (quand un scan est réussi)
DROP POLICY IF EXISTS "Allow anon insert on presences" ON public.presences;
CREATE POLICY "Allow anon insert on presences" 
ON public.presences FOR INSERT 
WITH CHECK (true);
