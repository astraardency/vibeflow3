import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { ENV } from '../../config/env';

export const HostDashboard = ({
  hostPlaylists, setHostPlaylists,
  isHost, setIsHost,
  showHostLoginModal, setShowHostLoginModal,
  setCurrentView
}) => {
  const [hostPinInput, setHostPinInput] = useState('');
  const [hostLoginError, setHostLoginError] = useState('');

  const fetchHostPlaylists = async () => {
    try {
      const q = query(collection(db, 'playlists'));
      const snapshot = await getDocs(q);
      const pls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHostPlaylists(pls);
    } catch (e) {
      console.error(e);
      alert("Error fetching playlists");
    }
  };

  const handleHostDashboardSubmit = async (e) => {
    e?.preventDefault();
    if (!hostPinInput) return;
    
    try {
      const storedHash = ENV.HOST_PIN_HASH;
      
      if (!storedHash) {
        setHostLoginError("Host PIN is not securely configured in .env");
        return;
      }
      
      const isBase64Match = btoa(hostPinInput) === storedHash;
      let hashHex = '';

      if (crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(hostPinInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      if ((hashHex && hashHex === storedHash) || isBase64Match) {
        setIsHost(true);
        setCurrentView('host_dashboard');
        setShowHostLoginModal(false);
        fetchHostPlaylists();
      } else {
        setHostLoginError("Invalid PIN.");
      }
    } catch (e) {
      console.error("Error verifying PIN:", e);
      setHostLoginError("Error verifying PIN.");
    }
  };

  const handleAdminDeletePlaylist = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this playlist from the server?")) {
      try {
        await deleteDoc(doc(db, 'playlists', id));
        setHostPlaylists(hostPlaylists.filter(p => p.id !== id));
        alert("Playlist deleted.");
      } catch (e) {
        console.error(e);
        alert("Error deleting playlist.");
      }
    }
  };

  if (showHostLoginModal) {
    return (
      <div className="host-login-modal">
        <div className="host-login-content glass-panel" style={{ padding: 24, borderRadius: 16, maxWidth: 400, margin: '40px auto' }}>
          <h3 style={{ marginTop: 0 }}>Host Verification</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Please enter the host PIN to access the dashboard.</p>
          <form onSubmit={handleHostDashboardSubmit}>
            <input
              type="password"
              placeholder="Enter PIN"
              value={hostPinInput}
              onChange={e => setHostPinInput(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)', marginBottom: 16 }}
              autoFocus
            />
            {hostLoginError && <div style={{ color: '#ff3b30', fontSize: 14, marginBottom: 16 }}>{hostLoginError}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setShowHostLoginModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: 'var(--card-orange)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Verify</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!isHost) return null;

  return (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0, color: 'var(--card-orange)' }}>Host Dashboard</h3>
      <p className="sub-section-desc">Manage user-created content across the entire platform.</p>

      <div className="settings-divider"></div>

      <h3 className="sub-section-title">All Playlists ({hostPlaylists.length})</h3>

      {hostPlaylists.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 20 }}>No playlists found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {hostPlaylists.map(pl => (
            <div key={pl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--panel-bg)', borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-color)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: 4 }}>{pl.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Created by {pl.creator || 'Anonymous'} • {pl.songs?.length || 0} songs</div>
              </div>
              <button
                onClick={() => handleAdminDeletePlaylist(pl.id)}
                style={{ background: '#ff3b30', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
