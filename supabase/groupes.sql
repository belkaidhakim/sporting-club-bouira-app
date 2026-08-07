-- 1. Création de la table 'groupes'
CREATE TABLE public.groupes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL UNIQUE,
  capacite_max INTEGER DEFAULT 20,
  entraineur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  horaires TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sécurité RLS pour 'groupes'
ALTER TABLE public.groupes ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les connectés
CREATE POLICY "Enable read access for all authenticated users" 
ON public.groupes FOR SELECT 
USING (auth.role() = 'authenticated');

-- Ecriture uniquement pour admin et secretaire
CREATE POLICY "Enable write access for admins and secretaires" 
ON public.groupes FOR ALL 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'secretaire')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'secretaire')
);

-- 3. Insertion des groupes par défaut (pour correspondre à l'ancien système)
INSERT INTO public.groupes (nom, capacite_max) VALUES
  ('Initiation', 20),
  ('Apprentissage', 20),
  ('Entraînement', 20);

-- 4. Ajout de la colonne groupe_id à la table athletes
ALTER TABLE public.athletes 
ADD COLUMN groupe_id UUID REFERENCES public.groupes(id) ON DELETE SET NULL;

-- 5. Migration des données existantes (conversion texte -> ID)
UPDATE public.athletes
SET groupe_id = g.id
FROM public.groupes g
WHERE public.athletes.groupe = g.nom;

-- Note : Nous gardons la colonne texte "groupe" pour l'instant pour éviter de casser l'application pendant la transition.
-- Elle pourra être supprimée (ALTER TABLE athletes DROP COLUMN groupe) une fois que tout le code UI utilisera groupe_id.
