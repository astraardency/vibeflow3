import React from 'react';
import './Carousel.css';

const vibes = [
  { id: 1, img: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=300&auto=format&fit=crop' },
  { id: 2, img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300&auto=format&fit=crop' },
];

const VibesList = ({ onAction }) => {
  return (
    <div className="carousel-container">
      <h3 className="section-title">Cross-Over Vibes</h3>
      <div className="carousel-scroll hide-scrollbar">
        {vibes.map((vibe) => (
          <div key={vibe.id} className="carousel-card vibe-card" onClick={() => onAction(`Playing Cross-Over Vibe #${vibe.id}`)}>
            <img src={vibe.img} alt="vibe" className="carousel-img" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VibesList;
