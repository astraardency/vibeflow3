import React from 'react';
import { ToggleItem } from './SettingsShared';

export const PrivacySettings = ({
  followersFollowing, setFollowersFollowing,
  playlistsVisible, setPlaylistsVisible,
  handleActivateJam, setCurrentView
}) => (
  <div className="settings-scroll-view sub-view-padding">
    <h3 className="sub-section-title" style={{ marginTop: 0 }}>Playlist privacy</h3>
    <p className="sub-section-desc">Change who can see your playlists. Private playlists are only visible to you and people you invite, while everyone can view public playlists.</p>

    <div className="settings-divider"></div>

    <h3 className="sub-section-title">Profile visibility</h3>
    <ToggleItem
      title="Followers and following"
      subtitle="On your profile, people can see who's following you and who you're following."
      checked={followersFollowing}
      onChange={(e) => setFollowersFollowing(e.target.checked)}
    />
    <ToggleItem
      title="Playlists"
      subtitle="People can see the playlists you've added to your profile."
      checked={playlistsVisible}
      onChange={(e) => setPlaylistsVisible(e.target.checked)}
    />
    <div className="settings-toggle-item">
      <div className="settings-item-text">
        <span className="settings-item-title">Blocked users</span>
        <span className="settings-item-subtitle">Manage who you've blocked from viewing your profile.</span>
      </div>
    </div>

    <div className="settings-divider"></div>

    <h3 className="sub-section-title">Social features</h3>
    <div className="settings-action-item">
      <div className="action-item-text">
        <span className="action-title">Jam access with Bluetooth</span>
        <span className="action-subtitle">Use Bluetooth to connect to nearby devices and listen along with others.</span>
      </div>
      <button className="action-btn" onClick={handleActivateJam}>Activate</button>
    </div>

    <p className="info-text" style={{ marginTop: '30px', textDecoration: 'underline' }}>View more options on the Account Privacy page on the web</p>
  </div>
);
