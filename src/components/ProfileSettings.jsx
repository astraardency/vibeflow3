// src/components/ProfileSettings.jsx
import React from 'react';
import './ProfileSettings.css';

const ProfileSettings = ({ onClose }) => {
  return (
    <div className="profile-overlay" role="dialog" aria-modal="true">
      <div className="profile-container">
        <h2 className="profile-title">Profile Settings</h2>
        {/* Example setting: Dark Mode toggle */}
        <div className="setting-item">
          <label htmlFor="darkModeToggle">Dark Mode</label>
          <input type="checkbox" id="darkModeToggle" />
        </div>
        {/* Add more settings as needed */}
        <button className="profile-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default ProfileSettings;
