import React from 'react';
import './BottomNav.css';
import { Home, Search, PlusSquare, BarChart2 } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab }) => {
  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  return (
    <div className="bottom-nav-container glass-nav">
      <div 
        className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} 
        onClick={() => handleTabClick('home')}
      >
        <Home size={22} strokeWidth={2.5} />
        {activeTab === 'home' && <span className="nav-text">Home</span>}
      </div>
      
      <div 
        className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} 
        onClick={() => handleTabClick('search')}
      >
        <Search size={22} strokeWidth={2.5} />
        {activeTab === 'search' && <span className="nav-text">Search</span>}
      </div>
      
      <div 
        className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} 
        onClick={() => handleTabClick('create')}
      >
        <PlusSquare size={22} strokeWidth={2.5} />
        {activeTab === 'create' && <span className="nav-text">Create</span>}
      </div>
      
      <div 
        className={`nav-item ${activeTab === 'library' ? 'active' : ''}`} 
        onClick={() => handleTabClick('library')}
      >
        <BarChart2 size={22} strokeWidth={2.5} />
        {activeTab === 'library' && <span className="nav-text">Vibe Stats</span>}
      </div>
    </div>
  );
};

export default BottomNav;
