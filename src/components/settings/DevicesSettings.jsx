import React from 'react';
import { Camera } from 'lucide-react';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const DevicesSettings = ({ setIsScanning, tvSessionId, isLoggedIn, email, username }) => {
  const startScan = async () => {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera === 'granted' || camera === 'limited') {
        const { barcodes } = await BarcodeScanner.scan();
        if (barcodes.length > 0) {
          handleScanResult(barcodes[0].rawValue || barcodes[0].displayValue);
        }
      } else {
        alert("Camera permission is required to scan QR codes.");
      }
    } catch (error) {
      console.error("Scanner error:", error);
      alert("Failed to start scanner: " + error.message);
    }
  };

  const stopScan = async () => {
    try {
      document.body.classList.remove('scanner-active');
      setIsScanning(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanResult = async (value) => {
    stopScan();
    if (value && value.startsWith('vibeflow-auth-tv-login:')) {
      const sessionId = value.split(':')[1];
      if (isLoggedIn) {
        try {
          const uid = localStorage.getItem('uid') || 'anonymous';
          await setDoc(doc(db, "tv_logins", sessionId), {
            uid: uid,
            email: email,
            username: username,
            timestamp: new Date().toISOString()
          });
          alert("Success! Your Vibeflow TV is now linked to your account.");
        } catch (e) {
          console.error(e);
          alert("Error linking TV: " + e.message);
        }
      } else {
        alert("Please log in on your phone first before scanning a TV code.");
      }
    } else if (value === 'vibeflow-auth-tv-login') {
      alert("Invalid or outdated TV code. Please refresh the TV app.");
    } else {
      alert(`Scanned code: ${value}`);
    }
  };

  return (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Link Vibeflow TV</h3>
      <p className="sub-section-desc">Scan the QR code shown on your Vibeflow TV app to instantly link your account.</p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '32px' }}>
        <div style={{
          width: 100, height: 100, borderRadius: 24,
          background: 'linear-gradient(135deg, var(--card-orange, #f5954a), #e07a30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(245, 149, 74, 0.35)'
        }}>
          <Camera size={48} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 18 }}>Scan TV QR Code</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            On your TV, go to Account and a QR code will appear.<br />
            Tap below to scan it with your camera.
          </p>
        </div>
        <button
          onClick={startScan}
          style={{
            background: 'linear-gradient(135deg, var(--card-orange, #f5954a), #e07a30)',
            border: 'none', color: 'white', borderRadius: 16,
            padding: '16px 40px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245, 149, 74, 0.4)', width: '100%', maxWidth: 300
          }}
        >
          Open Camera & Scan
        </button>
      </div>

      <div className="settings-divider" style={{ margin: '32px 0 16px' }}></div>

      <h3 className="sub-section-title">How it works</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { num: '1', text: 'Open Vibeflow on your TV or browser' },
          { num: '2', text: 'Go to Account — a QR code will appear on screen' },
          { num: '3', text: 'Tap "Open Camera & Scan" above and point at the QR code' },
          { num: '4', text: 'Your TV is instantly linked to this account!' }
        ].map(step => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              minWidth: 28, height: 28, borderRadius: '50%',
              background: 'var(--card-orange, #f5954a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 'bold', color: 'white'
            }}>{step.num}</div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
