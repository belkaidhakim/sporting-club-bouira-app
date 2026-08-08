import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { User, ShieldCheck } from 'lucide-react';

export default function BadgeGenerator({ athlete, showEndDate = false }) {
  if (!athlete) return null;

  let endDateStr = null;
  if (showEndDate && athlete.cotisations && athlete.cotisations.length > 0) {
    const sorted = [...athlete.cotisations].sort((a, b) => new Date(b.periode_couverte_fin) - new Date(a.periode_couverte_fin));
    if (sorted[0]?.periode_couverte_fin) {
      endDateStr = new Date(sorted[0].periode_couverte_fin).toLocaleDateString('fr-FR');
    }
  }

  const groupName = athlete.groupes?.nom || athlete.groupe || 'Membre';

  return (
    <div 
      className="badge-card" 
      style={{
        width: '480px',
        height: '285px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        color: '#0f172a',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        margin: '0 auto',
        border: '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Background Security Watermark Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 90% 10%, rgba(99, 102, 241, 0.05) 0%, transparent 60%), radial-gradient(circle at 10% 90%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header Bar */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)', 
        color: 'white', 
        padding: '0.65rem 1.25rem', 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center', 
        borderBottom: '2px solid #f59e0b',
        zIndex: 1 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/logo.jpg" 
            alt="Logo SCB" 
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '50%', 
              border: '2px solid #f59e0b', 
              objectFit: 'cover', 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }} 
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.04em', color: '#ffffff', lineHeight: 1.1 }}>
              SPORTING CLUB BOUIRA
            </h2>
            <span style={{ fontSize: '0.625rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              République Algérienne Démocratique et Populaire
            </span>
          </div>
        </div>
        <div style={{ 
          fontSize: '0.65rem', 
          fontWeight: 700, 
          letterSpacing: '0.08em', 
          background: 'rgba(245, 158, 11, 0.15)', 
          color: '#fbbf24', 
          border: '1px solid rgba(245, 158, 11, 0.4)',
          padding: '3px 8px', 
          borderRadius: '20px', 
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <ShieldCheck size={12} />
          CARTE D'ATHLÈTE
        </div>
      </div>
      
      {/* Body Content */}
      <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1.25rem', flex: 1, alignItems: 'center', zIndex: 1 }}>
        
        {/* Photo Container */}
        <div style={{ 
          width: '95px', 
          height: '120px', 
          backgroundColor: '#f1f5f9', 
          borderRadius: '10px', 
          border: '2px solid #e2e8f0', 
          overflow: 'hidden', 
          flexShrink: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
        }}>
          {athlete.photo ? (
            <img src={athlete.photo} alt="Athlète" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <User size={36} color="#cbd5e1" />
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>PHOTO</span>
            </div>
          )}
        </div>

        {/* Athlete Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nom & Prénom / Name
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.15, marginBottom: '0.4rem' }}>
            {athlete.nom?.toUpperCase()} {athlete.prenom}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.4rem' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>Né(e) le</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                {athlete.date_naissance ? new Date(athlete.date_naissance).toLocaleDateString('fr-FR') : '-'}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>Sexe</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                {athlete.sexe || '-'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Discipline / Groupe</div>
            <span style={{ 
              display: 'inline-block',
              backgroundColor: 'rgba(79, 70, 229, 0.1)', 
              color: '#4f46e5', 
              border: '1px solid rgba(79, 70, 229, 0.25)',
              padding: '2px 8px', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 700 
            }}>
              {groupName}
            </span>
          </div>
        </div>
        
        {/* QR Code Container */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ 
            padding: '6px', 
            backgroundColor: '#ffffff', 
            borderRadius: '10px', 
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <QRCodeSVG 
              value={athlete.token_qr || 'SCB-UNKNOWN'} 
              size={85} 
              level={"M"}
              includeMargin={false}
            />
          </div>
          <div style={{ fontSize: '0.55rem', color: '#64748b', marginTop: '4px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.05em' }}>
            ID: {athlete.token_qr ? athlete.token_qr.substring(0, 10) : 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Footer Security Ribbon */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        padding: '0.4rem 1.25rem', 
        borderTop: '1px solid #e2e8f0', 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center', 
        fontSize: '0.625rem', 
        color: '#64748b', 
        fontWeight: 600,
        zIndex: 1 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
          Carte officielle de membre · SC Bouira
        </div>
        <div>
          {showEndDate && endDateStr ? (
            <span style={{ color: '#e11d48', fontWeight: 700 }}>Valide jusqu'au : {endDateStr}</span>
          ) : (
            <span style={{ color: '#0284c7', fontWeight: 700 }}>Saison 2026 / 2027</span>
          )}
        </div>
      </div>
    </div>
  );
}
