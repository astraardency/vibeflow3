import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ToggleItem, RadioItem } from './SettingsShared';

export const DataSaverSettings = ({
  dataSaverMode, setDataSaverMode,
  downloadsCellular, setDownloadsCellular,
  audioOnlyDownloads, setAudioOnlyDownloads,
  audioOnlyStreaming, setAudioOnlyStreaming,
  handleRemoveDownloads, handleClearCache
}) => (
  <div className="settings-scroll-view sub-view-padding">
    <h3 className="sub-section-title">Data Saver mode</h3>
    <p className="sub-section-desc">Choose if you'd like to optimise your data usage. "On" lowers streaming quality and disables other features that use a lot of data, like video previews.</p>

    <div className="radio-group">
      <RadioItem title="Always on" selected={dataSaverMode === 'always_on'} onClick={() => setDataSaverMode('always_on')} />
      <RadioItem title="Automatic" subtitle="Adjusts based on Android's Data Saver setting." selected={dataSaverMode === 'automatic'} onClick={() => setDataSaverMode('automatic')} />
      <RadioItem title="Always off" selected={dataSaverMode === 'always_off'} onClick={() => setDataSaverMode('always_off')} />
    </div>

    <div className="settings-divider"></div>

    <h3 className="sub-section-title">Downloads and streaming</h3>
    <ToggleItem
      title="Downloads over cellular"
      subtitle="Downloads start or continue when you're not connected to Wi-Fi."
      checked={downloadsCellular}
      onChange={(e) => setDownloadsCellular(e.target.checked)}
      customSliderClass="grey-slider"
    />
    <ToggleItem
      title="Audio-only downloads for video podcasts"
      subtitle="Only the audio will save when you download video podcast."
      checked={audioOnlyDownloads}
      onChange={(e) => setAudioOnlyDownloads(e.target.checked)}
      customSliderClass="grey-slider"
    />
    <ToggleItem
      title="Audio-only streaming for video podcasts"
      subtitle="Video podcasts play as audio-only when you're not connected to Wi-Fi."
      checked={audioOnlyStreaming}
      onChange={(e) => setAudioOnlyStreaming(e.target.checked)}
      customSliderClass="grey-slider"
    />
    <div className="info-text">
      <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
      Video is never streamed when the vibeflow app is running in the background.
    </div>

    <div className="settings-divider"></div>

    <h3 className="sub-section-title">Storage</h3>

    <div className="settings-action-item">
      <div className="action-item-text">
        <span className="action-title">Remove all downloads</span>
        <span className="action-subtitle">Remove all the vibeflow content you've downloaded to free up space.</span>
      </div>
      <button className="action-btn" onClick={handleRemoveDownloads}>Remove</button>
    </div>

    <div className="settings-action-item">
      <div className="action-item-text">
        <span className="action-title">Clear cache</span>
        <span className="action-subtitle">Free up space by clearing your data. (Your downloads won't be removed.)</span>
      </div>
      <button className="action-btn" onClick={handleClearCache}>Clear</button>
    </div>
  </div>
);
