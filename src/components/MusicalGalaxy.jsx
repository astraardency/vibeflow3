import React, { useState, useRef, useEffect } from 'react';
import './MusicalGalaxy.css';
import { Music } from 'lucide-react';

// 8 specific Tamil artists requested by the user
const artists = [
  { name: 'Deva', img: 'https://i.pinimg.com/736x/d2/03/29/d20329dcc8e63d29a2c8ada710037aaf.jpg', color: 'rgba(255, 107, 107, 0.6)' },
  { name: 'Anirudh', img: 'https://i.pinimg.com/736x/d1/fd/23/d1fd230fec559c5c09c7c08651a2843a.jpg', color: 'rgba(78, 205, 196, 0.6)' },
  { name: 'A.R. Rahman', img: 'https://i.pinimg.com/1200x/9b/60/5c/9b605c223bd8a8eb82faf95b92c0df43.jpg', color: 'rgba(69, 183, 209, 0.6)' },
  { name: 'Harris Jayaraj', img: 'https://i.pinimg.com/736x/e3/bf/48/e3bf485d75d83bdb46a9efeea3e3f8ef.jpg', color: 'rgba(249, 202, 36, 0.6)' },
  { name: 'Yuvan Shankar', img: 'https://i.pinimg.com/736x/3b/65/3e/3b653e7e03078eda8712b5923d831bbc.jpg', color: 'rgba(104, 109, 224, 0.6)' },
  { name: 'Sai Abhyankkar', img: 'https://i.pinimg.com/736x/e8/d8/87/e8d88776ff92d9e8983d7dc642ba4084.jpg', color: 'rgba(255, 121, 121, 0.6)' },
  { name: 'Mano', img: 'https://i.pinimg.com/736x/46/2c/f3/462cf3c05551400733901d24799955a3.jpg', color: 'rgba(186, 220, 88, 0.6)' },
  { name: 'S.P.B', img: 'https://i.pinimg.com/1200x/fa/1c/72/fa1c72be17b0b9d1d8028384f4d1f809.jpg', color: 'rgba(224, 86, 253, 0.6)' },
  { name: 'G.V. Prakash', img: 'https://i.pinimg.com/736x/fd/e1/59/fde1596a79567a7e9e67b098ad4b6537.jpg', color: 'rgba(255, 107, 107, 0.6)' },
  { name: 'Hariharan', img: 'https://i.pinimg.com/736x/fb/ba/1c/fbba1c1859f29f4623f474409135ee22.jpg', color: 'rgba(78, 205, 196, 0.6)' },
];

const MusicalGalaxy = ({ onArtistSelect }) => {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState('');
  
  // Refs for drag tracking
  const dragStartX = useRef(0);
  const prevRotation = useRef(0);
  const rafRef = useRef(null);

  // Auto-rotation effect
  useEffect(() => {
    if (!isDragging) {
      const animate = () => {
        // Slowly subtract to rotate clockwise
        setRotation((prev) => prev - 0.15);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isDragging]);

  // Pointer event handlers for drag/swipe
  const handlePointerDown = (e) => {
    setIsDragging(true);
    // Support both mouse and touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    prevRotation.current = rotation;
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX.current;
    // Map swipe distance to rotation degrees
    setRotation(prevRotation.current + deltaX * 0.5);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleArtistClick = (artist) => {
    // Show popup message
    setSelectedMsg(`Exploring songs by ${artist.name}`);
    
    // Call parent handler
    if (onArtistSelect) {
      onArtistSelect({
        name: artist.name,
        img: artist.img
      });
    }

    // Hide popup after 3 seconds
    setTimeout(() => {
      setSelectedMsg('');
    }, 3000);
  };

  return (
    <div className="musical-galaxy-wrapper">
      <div className="galaxy-header">
        <h3 className="section-title">Musical Galaxy</h3>
        <p className="galaxy-subtitle">Spin the galaxy to explore your favorite artists</p>
      </div>
      
      {/* Container handles pointer events for dragging */}
      <div 
        className="galaxy-interactive-area"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* The rotating orbit */}
        <div 
          className="galaxy-orbit" 
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Static center planet with counter-rotation */}
          <div 
            className="galaxy-center-planet"
            style={{ transform: `rotate(${-rotation}deg)` }}
          >
            <Music size={24} color="white" fill="white" />
          </div>

          {/* Artist Planets */}
          {artists.map((artist, index) => {
            // Distribute 8 artists evenly across 360 degrees
            const angle = (index * 360) / artists.length;
            
            return (
              <div
                key={artist.name}
                className="galaxy-planet focusable"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation(); // prevent drag trigger
                  handleArtistClick(artist);
                }}
                style={{
                  // 1. Rotate to the angle
                  // 2. Translate out to the orbit radius (120px)
                  // 3. Counter-rotate by (-angle - rotation) so the image stays upright
                  transform: `rotate(${angle}deg) translateX(120px) rotate(${-angle - rotation}deg)`,
                  boxShadow: `0 0 20px ${artist.color}, inset 0 0 10px rgba(255,255,255,0.8)`
                }}
              >
                <img src={artist.img} alt={artist.name} draggable="false" />
                <span className="planet-label">{artist.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Popup Card for selection feedback */}
      <div className={`galaxy-popup ${selectedMsg ? 'show' : ''}`}>
        {selectedMsg}
      </div>
    </div>
  );
};

export default MusicalGalaxy;
