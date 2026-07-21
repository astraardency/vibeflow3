import React from 'react';
import { X } from 'lucide-react';

export default function PlaylistModals({
  showEditCoverModal,
  setShowEditCoverModal,
  editCoverImg,
  setEditCoverImg,
  handleSaveCoverImage,
  showCreateModal,
  setShowCreateModal,
  handleCreatePlaylist,
  newPlaylistName,
  setNewPlaylistName,
  newPlaylistImg,
  setNewPlaylistImg,
  isCreatingPlaylist
}) {
  return (
    <>
      {/* Edit Cover Modal */}
      {showEditCoverModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--panel-bg)', border: '1px solid var(--border-color)',
            padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Change Cover</h2>
              <button className="focusable" tabIndex={0} onClick={() => setShowEditCoverModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <input
                type="text"
                placeholder="Paste new Image URL..."
                value={editCoverImg}
                onChange={(e) => setEditCoverImg(e.target.value)}
                style={{
                  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: '8px', padding: '12px', color: 'var(--text-color)', marginBottom: '20px',
                  outline: 'none', fontSize: '14px'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="focusable" tabIndex={0} onClick={() => setShowEditCoverModal(false)} style={{ padding: '12px 24px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button className="focusable" tabIndex={0} onClick={handleSaveCoverImage} style={{ padding: '12px 24px', borderRadius: '8px', background: 'var(--card-orange)', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Save Cover</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Playlist Modal/Dialog */}
      {showCreateModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            padding: '24px',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ color: 'var(--text-color)', fontSize: '18px', fontWeight: '600', marginBottom: '16px', margin: 0 }}>Create New Playlist</h3>
            <form onSubmit={handleCreatePlaylist}>
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-color)',
                  marginBottom: '12px',
                  marginTop: '16px',
                  outline: 'none',
                  fontSize: '14px'
                }}
                autoFocus
              />
              <input
                type="text"
                placeholder="Playlist Image URL (optional)"
                value={newPlaylistImg}
                onChange={(e) => setNewPlaylistImg(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-color)',
                  marginBottom: '20px',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingPlaylist}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: isCreatingPlaylist ? 'not-allowed' : 'pointer',
                    opacity: isCreatingPlaylist ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPlaylist}
                  style={{
                    background: 'var(--card-orange)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: isCreatingPlaylist ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isCreatingPlaylist ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isCreatingPlaylist ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Importing...
                    </>
                  ) : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
