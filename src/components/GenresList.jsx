import React from 'react';
import './Carousel.css';

const genres = [
  { id: 1, title: 'MELODIES', img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=300&auto=format&fit=crop' },
  { id: 2, title: 'KUTHU', img: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=300&auto=format&fit=crop' },
];

const GenresList = ({ onAction }) => {
  return (
    <div className="carousel-container">
      <h3 className="section-title">Explore Genres</h3>
      <div className="carousel-scroll hide-scrollbar">
        {genres.map((genre) => (
          <div key={genre.id} className="carousel-card genre-card" onClick={() => onAction(`Exploring ${genre.title} genre...`)}>
            <img src={genre.img} alt={genre.title} className="carousel-img" />
            <div className="genre-title">{genre.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenresList;
