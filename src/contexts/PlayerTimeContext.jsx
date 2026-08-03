import React, { createContext, useContext, useState } from 'react';

const PlayerTimeContext = createContext();

export const usePlayerTime = () => useContext(PlayerTimeContext);

export const PlayerTimeProvider = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const value = {
    currentTime, setCurrentTime,
    duration, setDuration
  };

  return (
    <PlayerTimeContext.Provider value={value}>
      {children}
    </PlayerTimeContext.Provider>
  );
};
