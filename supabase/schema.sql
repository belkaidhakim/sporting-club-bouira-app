-- Table des athlètes
CREATE TABLE public.athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance DATE,
  telephone TEXT,
  groupe TEXT,
  sexe TEXT,
  date_inscription TIMESTAMPTZ DEFAULT NOW(),
  certificat_medical_valide BOOLEAN DEFAULT false,
  photo TEXT,
  token_qr TEXT UNIQUE NOT NULL
);

-- Table des cotisations
CREATE TABLE public.cotisations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
  montant_paye NUMERIC(10, 2) NOT NULL,
  date_paiement TIMESTAMPTZ DEFAULT NOW(),
  mode_paiement TEXT CHECK (mode_paiement IN ('Espèces', 'Virement', 'Chèque')),
  periode_couverte_fin DATE NOT NULL
);

-- Table des cartes d'accès
CREATE TABLE public.cartes_acces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID UNIQUE REFERENCES public.athletes(id) ON DELETE CASCADE,
  statut TEXT CHECK (statut IN ('ACTIVE', 'SUSPENDUE', 'EXPIREE')) DEFAULT 'SUSPENDUE',
  date_dernier_paiement TIMESTAMPTZ
);

-- Fonction pour mettre à jour la carte d'accès lors d'un paiement
CREATE OR REPLACE FUNCTION update_carte_acces_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cartes_acces (athlete_id, statut, date_dernier_paiement)
  VALUES (NEW.athlete_id, 'ACTIVE', NEW.date_paiement)
  ON CONFLICT (athlete_id) 
  DO UPDATE SET 
    statut = 'ACTIVE', 
    date_dernier_paiement = NEW.date_paiement;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour déclencher la mise à jour
CREATE TRIGGER after_cotisation_insert
AFTER INSERT ON public.cotisations
FOR EACH ROW
EXECUTE FUNCTION update_carte_acces_status();

-- Trigger pour la création automatique d'une carte d'accès "SUSPENDUE" à la création de l'athlète
CREATE OR REPLACE FUNCTION create_initial_carte_acces()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cartes_acces (athlete_id, statut)
  VALUES (NEW.id, 'SUSPENDUE');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_athlete_insert
AFTER INSERT ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION create_initial_carte_acces();
