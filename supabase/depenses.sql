-- 1. Création de la table 'depenses'
CREATE TABLE public.depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  montant DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  categorie TEXT NOT NULL,
  date_depense DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Activer la Row Level Security (RLS)
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;

-- 3. Règles d'accès (Admin et Secrétaire uniquement)
-- Lecture
CREATE POLICY "Enable read access for admins and secretaires" 
ON public.depenses FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'secretaire')
);

-- Ecriture
CREATE POLICY "Enable write access for admins and secretaires" 
ON public.depenses FOR ALL 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'secretaire')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'secretaire')
);
