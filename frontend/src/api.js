import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, withCredentials: true });

export const api = {
  me: () => http.get('/me').then(r => r.data),

  getFamily: () => http.get('/family').then(r => r.data),
  listFamilies: () => http.get('/families').then(r => r.data),
  createFamily: (body) => http.post('/family', body).then(r => r.data),
  updateFamily: (id, body) => http.put(`/family/${id}`, body).then(r => r.data),
  deleteFamily: (id) => http.delete(`/family/${id}`).then(r => r.data),
  shareFamily: (id) => http.post(`/family/${id}/share`).then(r => r.data),
  unshareFamily: (id) => http.post(`/family/${id}/unshare`).then(r => r.data),
  publicCookbook: (token) => http.get(`/public/cookbook/${token}`).then(r => r.data),

  // Universal transcription (voice audio or photo of a page)
  transcribeMedia: async (file, kind, language_code = 'unknown') => {
    const fd = new FormData();
    fd.append('file', file, file.name || (kind === 'photo' ? 'page.jpg' : 'recording.webm'));
    fd.append('kind', kind);
    fd.append('language_code', language_code);
    const r = await http.post('/transcribe', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 });
    return r.data;
  },

  listRecipes: () => http.get('/recipes').then(r => r.data),
  createRecipe: (body) => http.post('/recipes', body).then(r => r.data),
  likeRecipe: (id) => http.post(`/recipes/${id}/like`).then(r => r.data),
  updateRecipe: (id, body) => http.patch(`/recipes/${id}`, body).then(r => r.data),
  regenerateRecipeCover: (id) => http.post(`/recipes/${id}/regenerate-cover`, {}, { timeout: 120000 }).then(r => r.data),
  deleteRecipe: (id) => http.delete(`/recipes/${id}`).then(r => r.data),

  listStories: () => http.get('/stories').then(r => r.data),
  createStory: (body) => http.post('/stories', body).then(r => r.data),
  deleteStory: (id) => http.delete(`/stories/${id}`).then(r => r.data),

  listAlbums: () => http.get('/albums').then(r => r.data),
  createAlbum: (body) => http.post('/albums', body).then(r => r.data),

  getFamilyTree: () => http.get('/family-tree').then(r => r.data),
  addFamilyMember: (body) => http.post('/family-tree', body).then(r => r.data),

  listNotifications: () => http.get('/notifications').then(r => r.data),
  markAllRead: () => http.post('/notifications/mark-read').then(r => r.data),

  listInvites: () => http.get('/invites').then(r => r.data),
  createInvite: (body) => http.post('/invites', body).then(r => r.data),
  resendInvite: (id) => http.post(`/invites/${id}/resend`).then(r => r.data),
  deleteInvite: (id) => http.delete(`/invites/${id}`).then(r => r.data),

  submitContact: (body) => http.post('/contact', body).then(r => r.data),

  requestOtp: (body) => http.post('/auth/request-otp', body).then(r => r.data),
  verifyOtp: (body) => http.post('/auth/verify-otp', body).then(r => r.data),

  authSession: (session_id) => http.post('/auth/session', { session_id }).then(r => r.data),
  authMe: () => http.get('/auth/me').then(r => r.data),
  authUpdateMe: (body) => http.patch('/auth/me', body).then(r => r.data),
  authLogout: () => http.post('/auth/logout').then(r => r.data),
  authLogoutAll: () => http.post('/auth/logout-all-devices').then(r => r.data),
  authRegister: (body) => http.post('/auth/register', body).then(r => r.data),
  authLogin: (body) => http.post('/auth/login', body).then(r => r.data),
  authForgotPassword: (body) => http.post('/auth/forgot-password', body).then(r => r.data),
  authResetPassword: (body) => http.post('/auth/reset-password', body).then(r => r.data),

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
