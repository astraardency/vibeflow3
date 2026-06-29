import React from 'react';
import './MagicShuffle.css';
import { Zap, ChevronRight } from 'lucide-react'; 

const MagicShuffle = ({ onAction }) => {
  return (
    <div className="magic-shuffle-container">
      <h3 className="section-title">Magic Shuffle</h3>
      <div className="magic-card-new" onClick={() => onAction('Magic Shuffle activated!')}>
        <div className="magic-icon-wrapper">
          <Zap className="magic-zap-icon" size={24} strokeWidth={2} />
        </div>
        <div className="magic-info-new">
          <div className="magic-title-new">Enter the Magic</div>
          <div className="magic-subtitle-new">Swipe through a customized mix of gems</div>
        </div>
        <div className="magic-arrow">
          <ChevronRight size={24} color="#5b21b6" />
        </div>
      </div>
    </div>
  );
};

export default MagicShuffle;
