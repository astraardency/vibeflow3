import React from 'react';
import './Header.css';
import { Download, Sun, Moon, User } from 'lucide-react';

const Header = ({ onAction, isDarkMode, setIsDarkMode, openProfile, openDownload, userPhoto }) => {
  return (
    <header className="header">
      <div className="header-title" onClick={() => onAction('Greeting!')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1>
          {(() => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            if (hour < 21) return 'Good Evening';
            return 'Good Night';
          })()}
        </h1>
      </div>
      <div className="header-actions">
        <button 
          className="theme-toggle-btn" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{ 
            background: 'rgba(0,0,0,0.05)', 
            border: 'none', 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            color: 'var(--text-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer', 
            marginRight: '8px',
            transition: 'background 0.2s ease'
          }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="download-btn" onClick={openDownload}>
          <Download size={24} strokeWidth={2.5} />
        </button>

      </div>
    </header>
  );
};

export default Header;
