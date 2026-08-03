import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BadgeGenerator({ athlete, showEndDate = false }) {
  if (!athlete) return null;

  let endDateStr = null;
  if (showEndDate && athlete.cotisations && athlete.cotisations.length > 0) {
    const sorted = [...athlete.cotisations].sort((a, b) => new Date(b.periode_couverte_fin) - new Date(a.periode_couverte_fin));
    if (sorted[0]?.periode_couverte_fin) {
      endDateStr = new Date(sorted[0].periode_couverte_fin).toLocaleDateString('fr-FR');
    }
  }

  return (
    <div 
      className="badge-card" 
      style={{
        width: '480px',
        height: '280px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        color: '#1e293b',
        fontFamily: "'Inter', sans-serif",
        margin: '0 auto',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '150%', height: '100%', background: 'linear-gradient(135deg, rgba(22,163,74,0.1) 0%, rgba(21,128,61,0.05) 100%)', transform: 'rotate(-10deg)', zIndex: 0 }}></div>
      
      {/* Header */}
      <div style={{ backgroundColor: '#16a34a', color: 'white', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.5)', objectFit: 'cover', backgroundColor: 'white' }} />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px' }}>SPORTING CLUB BOUIRA</h2>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', marginLeft: '10px' }}>CARTE D'ACCÈS</div>
      </div>
      
      {/* Body */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', flex: 1, zIndex: 1 }}>
        
        {/* Photo Container */}
        <div style={{ width: '100px', height: '130px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '2px solid #e2e8f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {athlete.photo ? (
            <img src={athlete.photo} alt="Athlète" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ color: '#cbd5e1', textAlign: 'center', fontSize: '0.8rem' }}>PHOTO</div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Nom / Surname</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.1 }}>{athlete.nom.toUpperCase()}</div>
          
          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Prénom / Given Name</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.1 }}>{athlete.prenom}</div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', rowGap: '0.25rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Né(e) le</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{athlete.date_naissance ? new Date(athlete.date_naissance).toLocaleDateString('fr-FR') : '-'}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Sexe</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{athlete.sexe || '-'}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Groupe</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#16a34a' }}>{athlete.groupe || '-'}</div>
            </div>
          </div>
        </div>
        
        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0 }}>
          <div style={{ padding: '6px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <QRCodeSVG 
              value={athlete.token_qr} 
              size={70} 
              level={"H"}
              includeMargin={false}
            />
          </div>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '6px', textAlign: 'center', width: '70px', wordBreak: 'break-all' }}>
            {athlete.token_qr.substring(0, 13)}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
          Valable uniquement avec une cotisation à jour
        </div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
          {showEndDate && endDateStr ? (
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Fin : {endDateStr}</span>
          ) : (
            'Saison 2026/2027'
          )}
        </div>
      </div>
    </div>
  );
}
