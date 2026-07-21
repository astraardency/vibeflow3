import React from 'react';
import { Headphones, Sparkles } from 'lucide-react';
import AsyncArtistImage from '../components/AsyncArtistImage';

export default function VibeStatsView({
  setIsAccountSettingsOpen,
  currentUser,
  playsCount,
  dailyPlays,
  artistPlays,
  isDarkMode,
  showAllComposers,
  setShowAllComposers
}) {
  return (
    <div className="vibe-stats-screen">
      <div className="stats-header-container">
        <h2 className="stats-title">Vibe Stats</h2>
        <div className="stats-profile-avatar" onClick={() => setIsAccountSettingsOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 'none', background: 'var(--card-bg)' }}>
          <img src={currentUser?.photoURL || '/icon.png'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <Headphones size={22} className="stats-card-icon" />
          <div className="stats-card-label">Total Plays</div>
          <div className="stats-card-val">{playsCount} songs</div>
        </div>

        <div className="stats-card">
          <Sparkles size={22} className="stats-card-icon" />
          <div className="stats-card-label">Vibe Tier</div>
          <div className="stats-card-val">
            {playsCount > 100 ? 'Melophile' : playsCount > 50 ? 'Enthusiast' : playsCount > 10 ? 'Explorer' : 'Starter'}
          </div>
        </div>
      </div>

      {(() => {
        const maxPlays = Math.max(...(dailyPlays || [0, 0, 0, 0, 0, 0, 0]));
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const peakDayIdx = (dailyPlays || []).indexOf(maxPlays);
        const peakDayStr = maxPlays > 0 ? days[peakDayIdx] : '';
        const todayIdx = (new Date().getDay() + 6) % 7;
        const isPeakToday = maxPlays > 0 && peakDayIdx === todayIdx;
        const peakText = playsCount === 0 ? "No tracks played yet" : (isPeakToday ? "Today is your peak day!" : `Your peak day is ${peakDayStr}`);

        return (
          <div className="peak-vibe-banner">
            <span className="lightning-icon">⚡</span>
            <div className="peak-vibe-text">
              <span className="peak-vibe-label">PEAK VIBE DAY</span>
              <span className="peak-vibe-val">{peakText}</span>
            </div>
          </div>
        );
      })()}

      {(() => {
        const getArtistImage = (name) => {
          const nameLower = name.toLowerCase();
          if (nameLower.includes('deva')) return 'https://i.pinimg.com/736x/d2/03/29/d20329dcc8e63d29a2c8ada710037aaf.jpg';
          if (nameLower.includes('anirudh')) return 'https://i.pinimg.com/736x/d1/fd/23/d1fd230fec559c5c09c7c08651a2843a.jpg';
          if (nameLower.includes('balasubra') || nameLower.includes('spb') || nameLower.includes('s.p.b')) return 'https://i.pinimg.com/1200x/fa/1c/72/fa1c72be17b0b9d1d8028384f4d1f809.jpg';
          if (nameLower.includes('rahman')) return 'https://i.pinimg.com/1200x/9b/60/5c/9b605c223bd8a8eb82faf95b92c0df43.jpg';
          if (nameLower.includes('harris')) return 'https://i.pinimg.com/736x/e3/bf/48/e3bf485d75d83bdb46a9efeea3e3f8ef.jpg';
          if (nameLower.includes('yuvan')) return 'https://i.pinimg.com/736x/3b/65/3e/3b653e7e03078eda8712b5923d831bbc.jpg';
          if (nameLower.includes('sai')) return 'https://i.pinimg.com/736x/e8/d8/87/e8d88776ff92d9e8983d7dc642ba4084.jpg';
          if (nameLower.includes('mano')) return 'https://i.pinimg.com/736x/46/2c/f3/462cf3c05551400733901d24799955a3.jpg';
          if (nameLower.includes('hariharan')) return 'https://i.pinimg.com/736x/fb/ba/1c/fbba1c1859f29f4623f474409135ee22.jpg';
          if (nameLower.includes('g.v.prakash') || nameLower.includes('g. v. prakash') || nameLower.includes('g.v. prakash') || nameLower.includes('g v prakash')) return 'https://i.pinimg.com/736x/fd/e1/59/fde1596a79567a7e9e67b098ad4b6537.jpg';
          if (nameLower.includes('ilaiyaraaja') || nameLower.includes('ilayaraja')) return 'https://c.saavncdn.com/artists/Ilaiyaraaja_20230828071840_500x500.jpg';
          if (nameLower.includes('santhosh narayanan')) return 'https://c.saavncdn.com/artists/Santhosh_Narayanan_500x500.jpg';
          if (nameLower.includes('hiphop') || nameLower.includes('tamizha')) return 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg';
          return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop';
        };

        const COMPOSER_GROUPS = {
          'A.R. Rahman': ['a.r. rahman', 'ar rahman', 'a r rahman', 'rahman'],
          'Anirudh Ravichander': ['anirudh'],
          'Harris Jayaraj': ['harris'],
          'Yuvan Shankar Raja': ['yuvan'],
          'Ilaiyaraaja': ['ilaiyaraaja', 'ilayaraja'],
          'Deva': ['deva'],
          'Santhosh Narayanan': ['santhosh narayanan'],
          'G.V. Prakash': ['g.v. prakash', 'g v prakash', 'gv prakash'],
          'Hiphop Tamizha': ['hiphop tamizha', 'hiphop'],
          'Vidyasagar': ['vidyasagar'],
          'D. Imman': ['imman'],
          'Thaman S': ['thaman'],
          'Devi Sri Prasad': ['devi sri prasad', 'dsp'],
          'Karthik Raja': ['karthik raja'],
          'Bharadwaj': ['bharadwaj'],
          'Sirpy': ['sirpy'],
          'S.A. Rajkumar': ['s.a. rajkumar', 'sa rajkumar', 's a rajkumar'],
          'M.S. Viswanathan': ['m.s. viswanathan', 'msv'],
          'Sam C.S.': ['sam c.s.', 'sam cs'],
          'Ghibran': ['ghibran'],
          'Sean Roldan': ['sean roldan'],
          'Vishal Chandrashekhar': ['vishal chandrashekhar'],
          'Leon James': ['leon james'],
          'Vivek-Mervin': ['vivek-mervin'],
          'Justin Prabhakaran': ['justin prabhakaran'],
          'Jakes Bejoy': ['jakes bejoy'],
          'Gopi Sundar': ['gopi sundar'],
          'Radhan': ['radhan'],
          'Darbuka Siva': ['darbuka siva']
        };

        const groupedPlays = {};
        Object.entries(artistPlays || {}).forEach(([name, count]) => {
          if (!name || name.trim() === '' || name === 'undefined' || count <= 0) return;
          const lower = name.toLowerCase();
          for (const [canonical, aliases] of Object.entries(COMPOSER_GROUPS)) {
            if (aliases.some(alias => lower.includes(alias))) {
              groupedPlays[canonical] = (groupedPlays[canonical] || 0) + count;
              break;
            }
          }
        });

        const sortedArtists = Object.entries(groupedPlays).sort(([, a], [, b]) => b - a);
        const topArtist = sortedArtists.length > 0
          ? { name: sortedArtists[0][0], count: sortedArtists[0][1], img: getArtistImage(sortedArtists[0][0]) }
          : { name: 'Hiphop Tamizha', count: 0, img: getArtistImage('Hiphop Tamizha') };


        return (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ backgroundColor: 'var(--card-bg, white)', borderRadius: '24px', padding: '30px 20px', textAlign: 'center', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-color, #000)', marginBottom: '20px' }}>#1 Top Artist</h3>

              <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto', marginBottom: '16px' }}>
                <div style={{ position: 'absolute', inset: '-4px', background: 'linear-gradient(45deg, #ff7b00, #ff0055)', borderRadius: '50%', filter: 'blur(8px)', opacity: 0.6 }}></div>
                <AsyncArtistImage artistName={topArtist.name} fallbackImg={topArtist.img} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--card-bg, white)' }} alt={topArtist.name} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop'; }} />
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-color, #000)', marginBottom: '12px' }}>{topArtist.name}</h2>

              <div style={{ display: 'inline-block', backgroundColor: 'var(--hover-bg, #e5e5e5)', color: 'var(--text-color, #333)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                Played {topArtist.count} times
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ marginBottom: '32px', padding: '0 20px' }}>
        <div style={{
          background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))' : 'var(--card-bg, #ffffff)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--border-color, #eef0f3)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-color, #000)', margin: '0 0 4px 0' }}>Weekly Overview</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, rgba(0,0,0,0.5))', marginBottom: '24px', fontWeight: '500' }}>
            {(() => {
              const playsArr = dailyPlays || [0, 0, 0, 0, 0, 0, 0];
              const totalPlays = playsArr.reduce((a, b) => a + b, 0);
              const activeDays = playsArr.filter(p => p > 0).length || 1;
              return `Avg. ${Math.round(totalPlays / activeDays)} songs / day`;
            })()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const todayIdx = (new Date().getDay() + 6) % 7;
              const isToday = idx === todayIdx;
              const maxPlays = Math.max(...dailyPlays, 10);
              let h = playsCount > 0 ? (dailyPlays[idx] / maxPlays) * 100 : 15;
              if (playsCount > 0) h = Math.max(15, Math.min(100, h));
              if (isToday && playsCount > 0) h = Math.max(h, 30);

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '10px', height: '100px', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'var(--bar-bg, #e5e5e7)', borderRadius: '10px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                    <div style={{
                      width: '100%',
                      height: `${h}%`,
                      background: isToday ? 'linear-gradient(to top, #ff7b00, #ff0055)' : (playsCount === 0 ? (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)') : 'linear-gradient(to top, #4facfe, #00f2fe)'),
                      borderRadius: '10px',
                      boxShadow: isToday ? '0 0 10px rgba(255, 0, 85, 0.5)' : 'none',
                      transition: 'height 0.5s ease-out'
                    }}></div>
                  </div>
                  <span style={{ marginTop: '12px', fontSize: '12px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--text-color, #000)' : 'var(--text-secondary, rgba(0,0,0,0.4))' }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ paddingBottom: '120px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: '16px' }}>
          <h3 style={{ color: 'var(--text-color, #000)', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Top Artists</h3>
          <span onClick={() => setShowAllComposers(!showAllComposers)} style={{ color: 'var(--text-secondary, rgba(0,0,0,0.5))', fontSize: '13px', cursor: 'pointer' }}>{showAllComposers ? 'View Less' : 'View All'}</span>
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', flexWrap: showAllComposers ? 'wrap' : 'nowrap', overflowX: showAllComposers ? 'hidden' : 'auto', padding: '0 20px', gap: '16px', scrollSnapType: showAllComposers ? 'none' : 'x mandatory' }}>
          {(() => {
            const getArtistImage = (name) => {
              const nameLower = name.toLowerCase();
              if (nameLower.includes('deva')) return 'https://i.pinimg.com/736x/d2/03/29/d20329dcc8e63d29a2c8ada710037aaf.jpg';
              if (nameLower.includes('anirudh')) return 'https://i.pinimg.com/736x/d1/fd/23/d1fd230fec559c5c09c7c08651a2843a.jpg';
              if (nameLower.includes('balasubra') || nameLower.includes('spb') || nameLower.includes('s.p.b')) return 'https://i.pinimg.com/1200x/fa/1c/72/fa1c72be17b0b9d1d8028384f4d1f809.jpg';
              if (nameLower.includes('rahman')) return 'https://i.pinimg.com/1200x/9b/60/5c/9b605c223bd8a8eb82faf95b92c0df43.jpg';
              if (nameLower.includes('harris')) return 'https://i.pinimg.com/736x/e3/bf/48/e3bf485d75d83bdb46a9efeea3e3f8ef.jpg';
              if (nameLower.includes('yuvan')) return 'https://i.pinimg.com/736x/3b/65/3e/3b653e7e03078eda8712b5923d831bbc.jpg';
              if (nameLower.includes('sai')) return 'https://i.pinimg.com/736x/e8/d8/87/e8d88776ff92d9e8983d7dc642ba4084.jpg';
              if (nameLower.includes('mano')) return 'https://i.pinimg.com/736x/46/2c/f3/462cf3c05551400733901d24799955a3.jpg';
              if (nameLower.includes('hariharan')) return 'https://i.pinimg.com/736x/fb/ba/1c/fbba1c1859f29f4623f474409135ee22.jpg';
              if (nameLower.includes('g.v.prakash') || nameLower.includes('g. v. prakash') || nameLower.includes('g.v. prakash') || nameLower.includes('g v prakash')) return 'https://i.pinimg.com/736x/fd/e1/59/fde1596a79567a7e9e67b098ad4b6537.jpg';
              if (nameLower.includes('ilaiyaraaja') || nameLower.includes('ilayaraja')) return 'https://c.saavncdn.com/artists/Ilaiyaraaja_20230828071840_500x500.jpg';
              if (nameLower.includes('santhosh narayanan')) return 'https://c.saavncdn.com/artists/Santhosh_Narayanan_500x500.jpg';
              if (nameLower.includes('hiphop') || nameLower.includes('tamizha')) return 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg';
              return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop';
            };

            const COMPOSER_GROUPS = {
              'A.R. Rahman': ['a.r. rahman', 'ar rahman', 'a r rahman', 'rahman'],
              'Anirudh Ravichander': ['anirudh'],
              'Harris Jayaraj': ['harris'],
              'Yuvan Shankar Raja': ['yuvan'],
              'Ilaiyaraaja': ['ilaiyaraaja', 'ilayaraja'],
              'Deva': ['deva'],
              'Santhosh Narayanan': ['santhosh narayanan'],
              'G.V. Prakash': ['g.v. prakash', 'g v prakash', 'gv prakash'],
              'Hiphop Tamizha': ['hiphop tamizha', 'hiphop'],
              'Vidyasagar': ['vidyasagar'],
              'D. Imman': ['imman'],
              'Thaman S': ['thaman'],
              'Devi Sri Prasad': ['devi sri prasad', 'dsp'],
              'Karthik Raja': ['karthik raja'],
              'Bharadwaj': ['bharadwaj'],
              'Sirpy': ['sirpy'],
              'S.A. Rajkumar': ['s.a. rajkumar', 'sa rajkumar', 's a rajkumar'],
              'M.S. Viswanathan': ['m.s. viswanathan', 'msv'],
              'Sam C.S.': ['sam c.s.', 'sam cs'],
              'Ghibran': ['ghibran'],
              'Sean Roldan': ['sean roldan'],
              'Vishal Chandrashekhar': ['vishal chandrashekhar'],
              'Leon James': ['leon james'],
              'Vivek-Mervin': ['vivek-mervin'],
              'Justin Prabhakaran': ['justin prabhakaran'],
              'Jakes Bejoy': ['jakes bejoy'],
              'Gopi Sundar': ['gopi sundar'],
              'Radhan': ['radhan'],
              'Darbuka Siva': ['darbuka siva']
            };

            const groupedPlays = {};
            Object.entries(artistPlays || {}).forEach(([name, count]) => {
              if (!name || name.trim() === '' || name === 'undefined' || count <= 0) return;
              const lower = name.toLowerCase();
              for (const [canonical, aliases] of Object.entries(COMPOSER_GROUPS)) {
                if (aliases.some(alias => lower.includes(alias))) {
                  groupedPlays[canonical] = (groupedPlays[canonical] || 0) + count;
                  break;
                }
              }
            });

            const sorted = Object.entries(groupedPlays)
              .sort(([, a], [, b]) => b - a)
              .slice(0, showAllComposers ? undefined : 5)
              .map(([name, count]) => ({
                name,
                count,
                img: getArtistImage(name)
              }));

            return sorted.map((comp, i) => (
              <div key={i} style={{
                flex: '0 0 150px',
                height: '200px',
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
                scrollSnapAlign: 'start',
                cursor: 'pointer'
              }}>
                <AsyncArtistImage artistName={comp.name} fallbackImg={comp.img} alt={comp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)'
                }}></div>
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                  <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', lineHeight: '1.2', marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{comp.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{comp.count} plays</div>
                </div>
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '6px 10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  #{i + 1}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
