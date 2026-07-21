import React, { Suspense } from 'react';
import { ListMusic } from 'lucide-react';
import HeroCard from '../components/HeroCard';
import SuggestedSongsList from '../components/SuggestedSongsList';

const MagicShuffle = React.lazy(() => import('../components/MagicShuffle'));

export default function HomeView({
  listeningActivity,
  playlists,
  savedPlaylistIds,
  setSelectedPlaylist,
  setActiveTab,
  currentTrack,
  isPlaying,
  getSuggestedSongs,
  playSong,
  triggerToast
}) {
  return (
    <>
      <HeroCard />
      <SuggestedSongsList
        songs={getSuggestedSongs()}
        onSongPlay={playSong}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        hasActivity={listeningActivity.length > 0}
      />

      {(listeningActivity.length > 0 || playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).length > 0) && (
        <div className="carousel-container" style={{ marginTop: '0' }}>
          <h3 className="section-title">
            Latest Playlists
          </h3>
          <div className="carousel-scroll hide-scrollbar">
            {(() => {
              const recentlyPlayedPlaylists = [];
              const seenPlaylistIds = new Set();

              // Map listening activity songs back to their original playlists
              listeningActivity.forEach(song => {
                // Find the FIRST playlist that contains this song to avoid showing duplicates
                const matchingPlaylist = playlists.find(playlist =>
                  !playlist.hidden &&
                  !seenPlaylistIds.has(playlist.id || playlist.name) &&
                  playlist.songs?.some(s => s.title === song.title)
                );

                if (matchingPlaylist) {
                  recentlyPlayedPlaylists.push(matchingPlaylist);
                  seenPlaylistIds.add(matchingPlaylist.id || matchingPlaylist.name);
                }
              });

              // Get user's saved/custom playlists
              const savedUserPlaylists = playlists
                .filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

              // Combine them, putting custom playlists FIRST, then recently played
              const combinedPlaylists = [...savedUserPlaylists, ...recentlyPlayedPlaylists];

              // Remove any duplicates (if a saved playlist was also recently played)
              const uniquePlaylists = [];
              const finalSeenIds = new Set();
              combinedPlaylists.forEach(p => {
                const id = p.id || p.name;
                if (!finalSeenIds.has(id)) {
                  uniquePlaylists.push(p);
                  finalSeenIds.add(id);
                }
              });

              // Limit to 8 playlists
              let playlistsToShow = uniquePlaylists.slice(0, 8);

              return playlistsToShow.map((playlist, idx) => {
                const gradients = [
                  'linear-gradient(135deg, #f5954a 0%, #ff6b9d 100%)',
                  'linear-gradient(135deg, #00e5cc 0%, #007cf0 100%)',
                  'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                  'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
                  'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
                ];
                const grad = gradients[idx % gradients.length];
                const playlistImg = playlist.img || playlist.songs?.[0]?.img;

                return (
                  <div
                    key={playlist.id || idx}
                    className="carousel-card song-card focusable"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPlaylist(playlist);
                      setActiveTab('create');
                    }}
                    style={{ boxShadow: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative' }}>
                      {playlistImg ? (
                        <img src={playlistImg} alt={playlist.name} className="carousel-img" loading="lazy" />
                      ) : (
                        <div className="carousel-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: grad }}>
                          <ListMusic size={48} color="white" />
                        </div>
                      )}
                    </div>
                    <div className="song-info">
                      <div className="song-title">
                        {playlist.name}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <MagicShuffle onAction={(msg) => {
          triggerToast(msg)
          const _songs = window.defaultSongs || [];
          const randomSong = _songs[Math.floor(Math.random() * _songs.length)];
          if (randomSong) playSong(randomSong)
        }} />
      </Suspense>
    </>
  );
}
