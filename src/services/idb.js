export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vibeflow_downloads', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('songs');
    };
  });
};

export const saveSongBlob = async (id, blob) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    store.put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getSongBlob = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readonly');
    const store = tx.objectStore('songs');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteSongBlob = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('songs', 'readwrite');
    const store = tx.objectStore('songs');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
