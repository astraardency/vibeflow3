import React from 'react';
import './ArtistList.css';

const artists = [
  {
    id: 1,
    name: 'Anirudh Ravichander',
    img: 'https://i.pinimg.com/736x/d1/fd/23/d1fd230fec559c5c09c7c08651a2843a.jpg',
    genre: 'Contemporary'
  },
  {
    id: 2,
    name: 'A. R. Rahman',
    img: 'https://i.pinimg.com/1200x/9b/60/5c/9b605c223bd8a8eb82faf95b92c0df43.jpg',
    genre: 'Legendary'
  },
  {
    id: 3,
    name: 'Harris Jayaraj',
    img: 'https://i.pinimg.com/736x/e3/bf/48/e3bf485d75d83bdb46a9efeea3e3f8ef.jpg',
    genre: 'Classic'
  },
  {
    id: 4,
    name: 'Yuvan Shankar Raja',
    img: 'https://i.pinimg.com/736x/3b/65/3e/3b653e7e03078eda8712b5923d831bbc.jpg',
    genre: 'Soulful'
  },
  {
    id: 5,
    name: 'Ilaiyaraaja',
    img: 'https://c.saavncdn.com/artists/Ilaiyaraaja_20230828071840_500x500.jpg',
    genre: 'Pioneer'
  },
  {
    id: 6,
    name: 'Deva',
    img: 'https://i.pinimg.com/736x/d2/03/29/d20329dcc8e63d29a2c8ada710037aaf.jpg',
    genre: 'Gaana'
  },
  {
    id: 7,
    name: 'Dhina',
    img: 'https://c.saavncdn.com/artists/Dhina_500x500.jpg',
    genre: 'Melody'
  },
  {
    id: 8,
    name: 'Vidyasagar',
    img: 'https://c.saavncdn.com/artists/Vidyasagar_500x500.jpg',
    genre: 'Romance'
  },
  {
    id: 9,
    name: 'D. Imman',
    img: 'https://c.saavncdn.com/artists/D_Imman_500x500.jpg',
    genre: 'Devotional'
  },
  {
    id: 10,
    name: 'G. V. Prakash Kumar',
    img: 'https://i.pinimg.com/736x/fd/e1/59/fde1596a79567a7e9e67b098ad4b6537.jpg',
    genre: 'Youth'
  },
  {
    id: 11,
    name: 'Hiphop Tamizha',
    img: 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg',
    genre: 'Hip-Hop'
  },
  {
    id: 12,
    name: 'Santhosh Narayanan',
    img: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_500x500.jpg',
    genre: 'Experimental'
  },
  {
    id: 13,
    name: 'Srikanth Deva',
    img: 'https://c.saavncdn.com/artists/Srikanth_deva.jpg',
    genre: 'Gaana'
  },
  {
    id: 14,
    name: 'Karthik',
    img: 'https://c.saavncdn.com/artists/Karthik_500x500.jpg',
    genre: 'Melody'
  },
  {
    id: 15,
    name: 'S. P. Balasubrahmanyam',
    img: 'https://i.pinimg.com/1200x/fa/1c/72/fa1c72be17b0b9d1d8028384f4d1f809.jpg',
    genre: 'Legend'
  },
  {
    id: 16,
    name: 'Sai abiyanker',
    img: 'https://i.pinimg.com/736x/e8/d8/87/e8d88776ff92d9e8983d7dc642ba4084.jpg',
    genre: 'Rock'
  },
  {
    id: 17,
    name: 'Mano',
    img: 'https://i.pinimg.com/736x/46/2c/f3/462cf3c05551400733901d24799955a3.jpg',
    genre: 'Versatile'
  },
  {
    id: 18,
    name: 'Hariharan',
    img: 'https://i.pinimg.com/736x/fb/ba/1c/fbba1c1859f29f4623f474409135ee22.jpg',
    genre: 'Soulful'
  }
];

// Fallback images from Unsplash in case CDN fails
const fallbackImages = {
  1: 'https://i.pinimg.com/736x/07/f7/a8/07f7a810d9fbac664ebb9dda1339c37e.jpg',
  2: 'https://i.pinimg.com/736x/a1/45/1b/a1451b2311ba7824d9be832e482852fa.jpg',
  3: 'https://i.pinimg.com/736x/b1/56/cf/b156cfac136c8cf08e44c3ad8282cd76.jpg',
  4: 'https://i.pinimg.com/736x/ac/85/72/ac8572d97f9ddd8ce00902f5e51ff57d.jpg',
  5: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop',
  6: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=200&auto=format&fit=crop',
  7: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=200&auto=format&fit=crop',
  8: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
  9: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=200&auto=format&fit=crop',
  10: 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f4b7?q=80&w=200&auto=format&fit=crop',
  11: 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg',
  12: 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?q=80&w=200&auto=format&fit=crop',
};

const ArtistList = ({ onArtistSelect, currentArtist }) => {
  return (
    <div className="artist-list-container">
      <div className="artist-list-header">
        <h3 className="section-title" style={{ margin: 0 }}>Artists You Love</h3>
        <span className="artist-count-badge">{artists.length} artists</span>
      </div>
      <div className="artist-scroll hide-scrollbar">
        {artists.map((artist) => {
          const isActive = currentArtist?.id === artist.id;
          return (
            <div
              key={artist.id}
              className={`artist-item ${isActive ? 'artist-item--active' : ''}`}
              onClick={() => onArtistSelect(artist)}
            >
              <div className="artist-img-ring">
                <div className="artist-img-wrapper">
                  <img
                    src={artist.img}
                    alt={artist.name}
                    className="artist-img"
                    onError={(e) => {
                      e.target.src = fallbackImages[artist.id] || fallbackImages[1];
                    }}
                  />
                  {isActive && (
                    <div className="artist-playing-overlay">
                      <div className="artist-bars">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="artist-name">{artist.name.split(' ')[0]}</span>
              <span className="artist-genre-tag">{artist.genre}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArtistList;
