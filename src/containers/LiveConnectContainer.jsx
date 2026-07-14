import React, { useState } from 'react';
import { X, Copy, Check, Radio } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { generateSecureCode } from '../utils/cryptoUtils';

const LiveConnectContainer = ({ isLiveConnectOpen, setIsLiveConnectOpen, isLiveConnected, setIsLiveConnected }) => {
  const { triggerToast } = useAppContext();
  const [connectCode, setConnectCode] = useState('');
  const [myLiveCode, setMyLiveCode] = useState(() => {
    return generateSecureCode(6);
  });
  const [isCopied, setIsCopied] = useState(false);

  if (!isLiveConnectOpen) return null;

  return (
    <div className="live-connect-modal">
      <div className="live-connect-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
            <Radio size={24} color="var(--card-orange)" /> Live Connect
          </h3>
          <button onClick={() => setIsLiveConnectOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {!isLiveConnected ? (
          <>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '10px', marginTop: 0 }}>Your Listen Code</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, fontSize: '32px', fontWeight: '800', letterSpacing: '4px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px' }}>
                  {myLiveCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(myLiveCode);
                    setIsCopied(true);
                    triggerToast('Code copied to clipboard!');
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  style={{ background: 'var(--card-orange)', border: 'none', width: '50px', height: '50px', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {isCopied ? <Check size={24} /> : <Copy size={24} />}
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
                Share this code with friends to let them listen along with you.
              </p>
            </div>

            <div style={{ textAlign: 'center', margin: '20px 0', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>OR</div>

            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '10px' }}>Join a Friend's Session</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={connectCode}
                  onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '15px', color: 'white', fontSize: '18px', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase' }}
                />
                <button
                  onClick={() => {
                    if (connectCode.length === 6) {
                      setIsLiveConnected(true);
                      triggerToast('Connected to live session!');
                      setTimeout(() => setIsLiveConnectOpen(false), 1500);
                    } else {
                      triggerToast('Please enter a valid 6-digit code');
                    }
                  }}
                  style={{ background: 'white', color: 'black', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Join
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ width: '80px', height: '80px', background: 'rgba(255,107,157,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', animation: 'pulse-glow 2s infinite' }}>
              <Radio size={40} color="var(--card-orange)" />
            </div>
            <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>Live Connected</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '30px' }}>You are listening along in a synchronized session.</p>
            <button
              onClick={() => {
                setIsLiveConnected(false);
                setConnectCode('');
                triggerToast('Disconnected from live session');
              }}
              style={{ background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', padding: '12px 30px', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveConnectContainer;
