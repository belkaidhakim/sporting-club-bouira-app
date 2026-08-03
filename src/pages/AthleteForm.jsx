import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function AthleteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    telephone: '',
    groupe: '',
    sexe: '',
    certificat_medical_valide: false,
    photo: null
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  useEffect(() => {
    if (id) {
      const fetchAthlete = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('athletes').select('*').eq('id', id).single();
        if (data) {
          setFormData(data);
          if (data.photo) setPhotoPreview(data.photo);
        }
        if (error) console.error('Error fetching athlete', error);
        setLoading(false);
      };
      fetchAthlete();
    }
  }, [id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // compress heavily to base64 jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setPhotoPreview(dataUrl);
        setFormData(prev => ({ ...prev, photo: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id) {
        // Update existing athlete
        const { error } = await supabase
          .from('athletes')
          .update({
            nom: formData.nom,
            prenom: formData.prenom,
            date_naissance: formData.date_naissance || null,
            telephone: formData.telephone,
            groupe: formData.groupe,
            sexe: formData.sexe,
            certificat_medical_valide: formData.certificat_medical_valide,
            photo: formData.photo
          })
          .eq('id', id);

        if (error) throw error;
        toast.success('Athlète mis à jour avec succès !');
      } else {
        // Generate a unique token for QR code
        const token_qr = `CLUB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const { error } = await supabase
          .from('athletes')
          .insert([
            { 
              ...formData,
              token_qr,
              // Assuming date_naissance might be empty string, make it null if so
              date_naissance: formData.date_naissance || null 
            }
          ]);

        if (error) throw error;
        toast.success('Athlète créé avec succès !');
      }
      
      navigate('/athletes');
    } catch (error) {
      console.error('Error creating athlete:', error.message);
      toast.error('Erreur lors de la création : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-6">
        <h1>{id ? 'Modifier Athlète' : 'Nouvel Athlète'}</h1>
        <p>{id ? 'Modifiez les informations de ce membre.' : 'Inscrivez un nouveau membre dans la base de données.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="form-group">
            <label className="form-label">Nom *</label>
            <input 
              type="text" 
              name="nom" 
              value={formData.nom} 
              onChange={handleChange} 
              className="form-input" 
              required 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Prénom *</label>
            <input 
              type="text" 
              name="prenom" 
              value={formData.prenom} 
              onChange={handleChange} 
              className="form-input" 
              required 
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="form-group">
            <label className="form-label">Date de naissance</label>
            <input 
              type="date" 
              name="date_naissance" 
              value={formData.date_naissance} 
              onChange={handleChange} 
              className="form-input" 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Téléphone</label>
            <input 
              type="tel" 
              name="telephone" 
              value={formData.telephone} 
              onChange={handleChange} 
              className="form-input" 
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="form-group">
            <label className="form-label">Groupe / Catégorie</label>
            <select 
              name="groupe" 
              value={formData.groupe} 
              onChange={handleChange} 
              className="form-select"
            >
              <option value="">Sélectionner un groupe</option>
              <option value="Initiation">Initiation</option>
              <option value="Apprentissage">Apprentissage</option>
              <option value="Entraînement">Entraînement</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Sexe</label>
            <select 
              name="sexe" 
              value={formData.sexe} 
              onChange={handleChange} 
              className="form-select"
            >
              <option value="">Sélectionner le sexe</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-1 gap-6 mb-4">
          <div className="form-group flex items-center">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                name="certificat_medical_valide" 
                checked={formData.certificat_medical_valide} 
                onChange={handleChange} 
                style={{ width: '20px', height: '20px' }}
              />
              <span className="font-medium">Certificat médical valide fourni</span>
            </label>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="form-group">
            <label className="form-label">Photo de l'athlète</label>
            <div className="flex items-center gap-4 mt-2">
              <div 
                style={{ 
                  width: '80px', 
                  height: '100px', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="text-muted text-sm text-center">Aucune photo</span>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="form-input flex-1" 
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <button type="button" onClick={() => navigate('/athletes')} className="btn btn-secondary">
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer l\'athlète'}
          </button>
        </div>
      </form>
    </div>
  );
}
