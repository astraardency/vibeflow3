import React from "react";
import { ArrowLeft, Download } from "lucide-react";
import "./DownloadContainer.css";

const DownloadContainer = ({ onClose, downloadedSongs = [], playSong }) => {
  return (
    <div className="download-overlay" role="dialog" aria-modal="true">
      <div className="download-container">
        <div className="download-header">
          <button className="download-back-btn" onClick={onClose} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <h2 className="download-title">Downloaded Songs</h2>
        </div>
        
        <div className="download-section hide-scrollbar">
          {downloadedSongs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7 }}>
              <Download size={48} style={{ marginBottom: '16px', color: 'var(--text-secondary)' }} />
              <p className="download-description">
                No downloaded songs yet.<br/>Click the download icon on a playing track to save it offline!
              </p>
            </div>
          ) : (
            <div className="playlist-songs-list">
              {downloadedSongs.map((song, idx) => (
                <div 
                  key={song.id || idx}
                  className="download-song-item focusable"
                  tabIndex={0}
                  onClick={() => {
                    if (playSong) playSong(song, idx, downloadedSongs);
                    onClose();
                  }}
                >
                  <img src={song.img || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop'} alt={song.title} className="download-song-img" />
                  <div className="download-song-info">
                    <div className="download-song-title">{song.title}</div>
                    <div className="download-song-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadContainer;
