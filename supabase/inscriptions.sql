-- Table des inscriptions / pré-inscriptions publiques
CREATE TABLE IF NOT EXISTS public.inscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_dossier TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance DATE NOT NULL,
  sexe TEXT CHECK (sexe IN ('Homme', 'Femme')),
  adresse TEXT,
  telephone TEXT NOT NULL,
  telephone_parent TEXT,
  groupe_id UUID REFERENCES public.groupes(id) ON DELETE SET NULL,
  groupe_nom TEXT,
  observations_medicales TEXT,
  photo TEXT,
  certificat_medical TEXT,
  autorisation_parentale TEXT,
  consentement_loi_18_07 BOOLEAN DEFAULT true NOT NULL,
  reglement_accepte BOOLEAN DEFAULT true NOT NULL,
  statut TEXT CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'REJETE')) DEFAULT 'EN_ATTENTE',
  motif_rejet TEXT,
  date_demande TIMESTAMPTZ DEFAULT NOW(),
  date_traitement TIMESTAMPTZ,
  traite_par UUID REFERENCES auth.users(id)
);

-- Activation de Row Level Security
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Politique d'insertion publique (Anonyme & Authentifié)
DROP POLICY IF EXISTS "Public can submit inscription" ON public.inscriptions;
CREATE POLICY "Public can submit inscription"
  ON public.inscriptions
  FOR INSERT
  WITH CHECK (statut = 'EN_ATTENTE');

-- 2. Politique de lecture pour les administrateurs et secrétaires
DROP POLICY IF EXISTS "Admins and Staff can view all inscriptions" ON public.inscriptions;
CREATE POLICY "Admins and Staff can view all inscriptions"
  ON public.inscriptions
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Politique de mise à jour pour les administrateurs et secrétaires (Validation / Rejet)
DROP POLICY IF EXISTS "Admins and Staff can update inscriptions" ON public.inscriptions;
CREATE POLICY "Admins and Staff can update inscriptions"
  ON public.inscriptions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Politique de suppression pour les administrateurs
DROP POLICY IF EXISTS "Admins can delete inscriptions" ON public.inscriptions;
CREATE POLICY "Admins can delete inscriptions"
  ON public.inscriptions
  FOR DELETE
  TO authenticated
  USING (true);
