import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

export const api = {
  me: () => http.get('/me').then(r => r.data),

  getFamily: () => http.get('/family').then(r => r.data),
  createFamily: (body) => http.post('/family', body).then(r => r.data),

  listRecipes: () => http.get('/recipes').then(r => r.data),
  createRecipe: (body) => http.post('/recipes', body).then(r => r.data),
  likeRecipe: (id) => http.post(`/recipes/${id}/like`).then(r => r.data),

  listStories: () => http.get('/stories').then(r => r.data),
  createStory: (body) => http.post('/stories', body).then(r => r.data),

  listAlbums: () => http.get('/albums').then(r => r.data),
  createAlbum: (body) => http.post('/albums', body).then(r => r.data),

  getFamilyTree: () => http.get('/family-tree').then(r => r.data),
  addFamilyMember: (body) => http.post('/family-tree', body).then(r => r.data),

  listNotifications: () => http.get('/notifications').then(r => r.data),
  markAllRead: () => http.post('/notifications/mark-read').then(r => r.data),

  listVoiceRecipes: () => http.get('/voice-recipes').then(r => r.data),
  uploadVoiceRecipe: async (file, meta) => {
    const fd = new FormData();
    fd.append('audio', file, meta.filename || 'recording.webm');
    fd.append('title', meta.title || 'Untitled Recipe');
    fd.append('author', meta.author || 'You');
    fd.append('language_code', meta.language_code || 'unknown');
    fd.append('duration', String(meta.duration || 0));
    const r = await http.post('/voice-recipes', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
    return r.data;
  },
  deleteVoiceRecipe: (id) => http.delete(`/voice-recipes/${id}`).then(r => r.data),
};

export default api;
