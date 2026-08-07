-- Table des présences (pointage)
CREATE TABLE public.presences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  date_scan TIMESTAMPTZ DEFAULT NOW()
);

-- Index unique pour empêcher le double scan le même jour pour un même athlète
-- On caste date_scan (TIMESTAMPTZ) en DATE pour n'avoir qu'une seule présence par jour
CREATE UNIQUE INDEX unique_presence_per_day 
ON public.presences (athlete_id, (date_scan::DATE));

-- Activer RLS (si nécessaire)
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture et l'insertion pour tout le monde (pour simplifier, ou à restreindre selon besoin)
CREATE POLICY "Allow all actions on presences" 
ON public.presences FOR ALL 
USING (true) WITH CHECK (true);
