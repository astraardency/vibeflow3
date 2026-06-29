export const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const formatTimeRemaining = (time, duration) => {
  if (isNaN(time) || isNaN(duration)) return '-0:00';
  const remaining = duration - time;
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `-${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const getSongImage = (song) => {
  if (!song) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
  if (song.img && !song.img.startsWith('images/')) {
    return song.img;
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
};
