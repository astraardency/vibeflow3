import React from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

export default function EqModal({
  showEqModal,
  setShowEqModal,
  eqFrequencies,
  eqGains,
  handleEqChange,
  setEqGains,
  eqBandsRef
}) {
  if (!showEqModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        color: 'var(--text-color)',
        animation: 'fadeIn 0.3s ease-out',
        position: 'relative'
      }}>
        <button
          onClick={() => setShowEqModal(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={24} />
        </button>
        <SlidersHorizontal size={48} style={{ color: 'var(--card-orange, #f5954a)', marginBottom: '20px', marginLeft: 'auto', marginRight: 'auto' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Equalizer</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>Fine-tune your audio frequencies.</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', height: '200px', marginBottom: '24px' }}>
          {eqFrequencies.map((freq, i) => (
            <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>+12</span>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={eqGains[i]}
                onChange={(e) => handleEqChange(i, parseFloat(e.target.value))}
                style={{
                  writingMode: 'vertical-lr',
                  direction: 'rtl',
                  appearance: 'slider-vertical',
                  width: '8px',
                  flex: 1,
                  accentColor: 'var(--card-orange)'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>-12</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '12px' }}>
                {freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const zeros = [0, 0, 0, 0, 0];
            setEqGains(zeros);
            zeros.forEach((v, i) => { if (eqBandsRef.current[i]) eqBandsRef.current[i].gain.value = v; });
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Reset to Flat
        </button>
      </div>
    </div>
  );
}
