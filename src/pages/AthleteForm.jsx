import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { ShieldAlert, PhoneCall, HeartPulse, FileText } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { useGroupes } from '../hooks/useGroupes';

const athleteSchema = z.object({
  nom: z.string().min(2, 'Le nom doit faire au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit faire au moins 2 caractères'),
  date_naissance: z.string().nullable().optional(),
  telephone: z.string().regex(/^(0)[5-7][0-9]{8}$/, 'Numéro de téléphone invalide (ex: 0550123456)').or(z.literal('')).nullable().optional(),
  contact_urgence: z.string().regex(/^(0)[5-7][0-9]{8}$/, 'Numéro d\'urgence invalide (ex: 0550123456)').or(z.literal('')).nullable().optional(),
  observations_medicales: z.string().nullable().optional(),
  groupe_id: z.string().nullable().optional(),
  sexe: z.enum(['Homme', 'Femme']).or(z.literal('')).nullable().optional(),
});

export default function AthleteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { groupes } = useGroupes();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    telephone: '',
    contact_urgence: '',
    observations_medicales: '',
    groupe_id: '',
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
          setFormData({
            nom: data.nom || '',
            prenom: data.prenom || '',
            date_naissance: data.date_naissance ? data.date_naissance.split('T')[0] : '',
            telephone: data.telephone || '',
            contact_urgence: data.contact_urgence || data.telephone_urgence || '',
            observations_medicales: data.observations_medicales || data.remarques_medicales || '',
            groupe_id: data.groupe_id || '',
            sexe: data.sexe || '',
            certificat_medical_valide: data.certificat_medical_valide || false,
            photo: data.photo || null
          });
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
    
    try {
      // Zod validation
      athleteSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        nom: formData.nom,
        prenom: formData.prenom,
        date_naissance: formData.date_naissance || null,
        telephone: formData.telephone || null,
        contact_urgence: formData.contact_urgence || null,
        observations_medicales: formData.observations_medicales || null,
        groupe_id: formData.groupe_id || null,
        sexe: formData.sexe || null,
        certificat_medical_valide: formData.certificat_medical_valide,
        photo: formData.photo || null
      };

      if (id) {
        // Update existing athlete
        let { error } = await supabase
          .from('athletes')
          .update(payload)
          .eq('id', id);

        if (error && error.message.includes('column')) {
          delete payload.contact_urgence;
          delete payload.observations_medicales;
          const retry = await supabase.from('athletes').update(payload).eq('id', id);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
        toast.success('Athlète mis à jour avec succès !');
      } else {
        // Generate a unique token for QR code
        const token_qr = `CLUB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        payload.token_qr = token_qr;

        let { error } = await supabase
          .from('athletes')
          .insert([payload]);

        if (error && error.message.includes('column')) {
          delete payload.contact_urgence;
          delete payload.observations_medicales;
          const retry = await supabase.from('athletes').insert([payload]);
          if (retry.error) throw retry.error;
        } else if (error) {
          throw error;
        }
        toast.success('Athlète créé avec succès !');
      }
      
      navigate('/athletes');
    } catch (error) {
      console.error('Error saving athlete:', error.message);
      toast.error('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="mb-6">
        <h1>{id ? 'Modifier Athlète' : 'Nouvel Athlète'}</h1>
        <p>{id ? 'Modifiez les informations personnelles, médicales et de contact de ce membre.' : 'Inscrivez un nouveau membre dans la base de données.'}</p>
      </div>

      <motion.form 
        onSubmit={handleSubmit} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6">
        {/* SECTION INFORMATIONS GÉNÉRALES */}
        <h3 className="text-base font-semibold mb-4 text-primary">Informations Personnelles</h3>
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
            <label className="form-label">Téléphone Personnel</label>
            <input 
              type="tel" 
              name="telephone" 
              placeholder="ex: 0550123456"
              value={formData.telephone} 
              onChange={handleChange} 
              className="form-input" 
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="form-group">
            <label className="form-label">Groupe d'entraînement</label>
            <select 
              name="groupe_id" 
              value={formData.groupe_id} 
              onChange={handleChange} 
              className="form-select"
            >
              <option value="">-- Non assigné --</option>
              {groupes.map(g => {
                const inscrits = g.athletes ? g.athletes.length : 0;
                const isFull = inscrits >= (g.capacite_max || 20);
                
                return (
                  <option key={g.id} value={g.id}>
                    {g.nom} ({inscrits}/{g.capacite_max || 20}) {isFull ? '- COMPLET !' : ''}
                  </option>
                );
              })}
            </select>
            {groupes.find(g => g.id === formData.groupe_id)?.athletes?.length >= (groupes.find(g => g.id === formData.groupe_id)?.capacite_max || 20) && (
              <div className="text-xs text-warning mt-1">⚠️ Ce groupe est plein. L'athlète sera quand même inscrit (forcé).</div>
            )}
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

        <div className="grid md:grid-cols-2 gap-6 mt-2 mb-6">
          <div className="form-group">
            <label className="form-label">Photo de l'athlète</label>
            <div className="flex items-center gap-4 mt-2">
              <div 
                style={{ 
                  width: '70px', 
                  height: '85px', 
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
                  <span className="text-muted text-xs text-center">Aucune photo</span>
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

        {/* SECTION SÉCURITÉ & SANTÉ (DEMANDÉE PAR L'ADMINISTRATEUR) */}
        <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldAlert size={20} style={{ color: '#ef4444' }} /> Sécurité & Informations Médicales
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <PhoneCall size={16} style={{ color: '#f59e0b' }} /> Contact d'Urgence (Parent / Tuteur)
              </label>
              <input 
                type="tel" 
                name="contact_urgence" 
                value={formData.contact_urgence} 
                onChange={handleChange} 
                placeholder="ex: 0555998877 (Distinct du tél. athlète)"
                className="form-input" 
              />
              <div className="text-xs text-muted mt-1">Numéro prioritaire à joindre immédiatement en cas d'urgence.</div>
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <HeartPulse size={16} style={{ color: '#10b981' }} /> Certificat Médical
              </label>
              <div className="flex items-center gap-3 mt-3">
                <input 
                  type="checkbox" 
                  name="certificat_medical_valide" 
                  id="certificat_medical_valide"
                  checked={formData.certificat_medical_valide} 
                  onChange={handleChange} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="certificat_medical_valide" className="font-medium cursor-pointer" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  Certificat médical de non-contre-indication fourni
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <FileText size={16} style={{ color: '#3b82f6' }} /> Observations & Antécédents Médicaux
            </label>
            <textarea 
              name="observations_medicales" 
              value={formData.observations_medicales} 
              onChange={handleChange} 
              placeholder="Allergies connues, asthme, traitements en cours, port de lunettes, précautions d'entraînement..."
              className="form-input" 
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <Button type="button" variant="secondary" onClick={() => navigate('/athletes')}>
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            {loading ? 'Enregistrement...' : 'Enregistrer l\'athlète'}
          </Button>
        </div>
        </Card>
      </motion.form>
    </div>
  );
}
