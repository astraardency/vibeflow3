import React, { useState, useEffect } from 'react';
import { searchArtists } from '../services/saavn';

const imageCache = new Map();

const AsyncArtistImage = ({ artistName, fallbackImg, style, alt, className, onError }) => {
  const [imgUrl, setImgUrl] = useState(imageCache.get(artistName) || fallbackImg);

  useEffect(() => {
    let isMounted = true;
    
    if (imageCache.has(artistName)) {
      setImgUrl(imageCache.get(artistName));
      return;
    }

    const fetchImg = async () => {
      try {
        const results = await searchArtists(artistName, 1);
        if (results && results.length > 0 && results[0].img) {
          const fetchedImg = results[0].img;
          if (!fetchedImg.includes('default')) {
            imageCache.set(artistName, fetchedImg);
            if (isMounted) setImgUrl(fetchedImg);
          }
        }
      } catch (err) {
        console.error('Failed to fetch artist image', err);
      }
    };
    
    fetchImg();

    return () => { 
        isMounted = false; 
    };
  }, [artistName, fallbackImg]);

  return <img src={imgUrl} style={style} alt={alt} className={className} onError={onError} />;
};

export default AsyncArtistImage;
