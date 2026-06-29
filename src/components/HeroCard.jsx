import React from 'react';
import './HeroCard.css';
import { Play } from 'lucide-react';

const HeroCard = ({ onAction }) => {
  return (
    <div className="hero-card-container">
      <div className="hero-card">
        <div className="hero-content">
          <h2 className="hero-title">Hello Melophile</h2>
          <p className="hero-subtitle">Ready to explore some amazing tunes today?</p>
        </div>
        <div class="hero-icon" role="button" tabindex="0" aria-label="Hero Icon Button">
        </div>
      </div>
    </div>
  );
};

export default HeroCard;
