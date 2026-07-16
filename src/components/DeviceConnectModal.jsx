import React from 'react';
import { useDeviceConnect } from '../contexts/DeviceConnectContext';
import { X, MonitorSpeaker, Smartphone, Laptop, Monitor } from 'lucide-react';
import { createPortal } from 'react-dom';

const DeviceConnectModal = () => {
  const { 
    isDeviceModalOpen, 
    setIsDeviceModalOpen, 
    availableDevices, 
    activeDeviceId, 
    transferPlayback,
    deviceId,
    isLocalDeviceActive
  } = useDeviceConnect();

  if (!isDeviceModalOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 99999
    }} onClick={() => setIsDeviceModalOpen(false)}>
      <div style={{
        backgroundColor: 'var(--card-bg, #1a1a1a)', width: '90%', maxWidth: '400px',
        borderRadius: '24px', padding: '24px', color: 'white'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MonitorSpeaker size={24} color="var(--card-orange, #f5954a)" />
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Connect to a device</h2>
          </div>
          <button onClick={() => setIsDeviceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {availableDevices.map(device => {
            const isLocal = device.id === deviceId;
            const isActive = (device.id === activeDeviceId && !isLocalDeviceActive) || (isLocal && isLocalDeviceActive);
            const Icon = device.deviceType === 'mobile' ? Smartphone : (device.deviceType === 'tv' ? Monitor : Laptop);
            
            return (
              <div 
                key={device.id}
                onClick={() => transferPlayback(device.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                  borderRadius: '12px', cursor: 'pointer',
                  backgroundColor: isActive ? 'rgba(245, 149, 74, 0.1)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1px solid var(--card-orange, #f5954a)' : '1px solid transparent'
                }}
              >
                <Icon size={28} color={isActive ? 'var(--card-orange, #f5954a)' : 'var(--text-secondary)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: isActive ? 'var(--card-orange, #f5954a)' : 'white' }}>
                    {device.deviceName} {isLocal && '(This Device)'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {isActive ? 'Listening On' : 'Ready to connect'}
                  </div>
                </div>
              </div>
            );
          })}
          
          {availableDevices.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              No other devices found.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeviceConnectModal;
