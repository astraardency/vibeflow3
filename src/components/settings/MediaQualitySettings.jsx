import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ToggleItem, RadioItem } from './SettingsShared';

export const MediaQualitySettings = ({
  wiFiStreamingQuality, setWiFiStreamingQuality,
  cellularStreamingQuality, setCellularStreamingQuality,
  autoAdjust, setAutoAdjust,
  audioDownloadQuality, setAudioDownloadQuality,
  handleUpdateDownloads
}) => (
  <div className="settings-scroll-view sub-view-padding">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Lossless</span>
      <span style={{ color: '#1ed760', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1ed760', display: 'inline-block' }}></div>
        Premium
      </span>
    </div>

    <h3 className="sub-section-title">Audio streaming quality</h3>
    <div className="info-text" style={{ marginBottom: '16px' }}>
      <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
      Quality changes on next track (unless a downloaded or higher-quality cached track is available).
    </div>

    <h4 className="sub-section-subtitle">Wi-Fi streaming quality</h4>
    <p className="sub-section-desc">Choose the quality of your audio streaming when you're connected to the internet.</p>

    <div className="radio-group" style={{ marginBottom: '24px' }}>
      <RadioItem title="Automatic" selected={wiFiStreamingQuality === 'Automatic'} onClick={() => setWiFiStreamingQuality('Automatic')} />
      <RadioItem title="Low" selected={wiFiStreamingQuality === 'Low'} onClick={() => setWiFiStreamingQuality('Low')} />
      <RadioItem title="Normal" selected={wiFiStreamingQuality === 'Normal'} onClick={() => setWiFiStreamingQuality('Normal')} />
      <RadioItem title="High" selected={wiFiStreamingQuality === 'High'} onClick={() => setWiFiStreamingQuality('High')} />
      <RadioItem title="Very high" selected={wiFiStreamingQuality === 'Very high'} onClick={() => setWiFiStreamingQuality('Very high')} />
    </div>

    <h4 className="sub-section-subtitle">Cellular streaming quality</h4>
    <p className="sub-section-desc">Choose the quality of your audio streaming when you're using mobile data.</p>

    <div className="radio-group" style={{ marginBottom: '24px' }}>
      <RadioItem title="Automatic" selected={cellularStreamingQuality === 'Automatic'} onClick={() => setCellularStreamingQuality('Automatic')} />
      <RadioItem title="Low" selected={cellularStreamingQuality === 'Low'} onClick={() => setCellularStreamingQuality('Low')} />
      <RadioItem title="Normal" selected={cellularStreamingQuality === 'Normal'} onClick={() => setCellularStreamingQuality('Normal')} />
      <RadioItem title="High" selected={cellularStreamingQuality === 'High'} onClick={() => setCellularStreamingQuality('High')} />
      <RadioItem title="Very high" selected={cellularStreamingQuality === 'Very high'} onClick={() => setCellularStreamingQuality('Very high')} />
    </div>

    <ToggleItem
      title="Auto-adjust"
      subtitle="Your Wi-Fi and cellular streaming quality adjust based on your network bandwidth."
      checked={autoAdjust}
      onChange={(e) => setAutoAdjust(e.target.checked)}
    />

    <div className="settings-divider"></div>

    <h3 className="sub-section-title">Download quality</h3>
    <div className="info-text" style={{ marginBottom: '16px' }}>
      <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
      Higher-quality downloads take up more space.
    </div>

    <h4 className="sub-section-subtitle">Audio download quality</h4>
    <p className="sub-section-desc">Choose the quality of all your audio downloads.</p>

    <div className="radio-group" style={{ marginBottom: '24px' }}>
      <RadioItem title="Automatic" selected={audioDownloadQuality === 'Automatic'} onClick={() => setAudioDownloadQuality('Automatic')} />
      <RadioItem title="Low" selected={audioDownloadQuality === 'Low'} onClick={() => setAudioDownloadQuality('Low')} />
      <RadioItem title="Normal" selected={audioDownloadQuality === 'Normal'} onClick={() => setAudioDownloadQuality('Normal')} />
      <RadioItem title="High" selected={audioDownloadQuality === 'High'} onClick={() => setAudioDownloadQuality('High')} />
      <RadioItem title="Very high" selected={audioDownloadQuality === 'Very high'} onClick={() => setAudioDownloadQuality('Very high')} />
    </div>

    <div className="settings-action-item">
      <div className="action-item-text">
        <span className="action-title" style={{ color: 'var(--text-secondary)' }}>Update existing downloads</span>
        <span className="action-subtitle">Update your existing downloads to the audio quality you've selected.</span>
      </div>
      <button className="action-btn" style={{ opacity: 0.5 }} onClick={handleUpdateDownloads}>Download</button>
    </div>
  </div>
);
