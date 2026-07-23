import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppShell from '../../components/AppShell';
import { Mic, Play, Square, Trash2, Loader2, Sparkles, X, Globe } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/use-toast';

const LANGS = [
  { code: 'unknown', label: 'Auto-detect' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'pa-IN', label: 'Punjabi' },
];

export default function VoiceRecipesPage() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(null); // { blob, url, duration }
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMeta, setSaveMeta] = useState({ title: '', author: 'You', language_code: 'unknown' });
  const [selected, setSelected] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRecordings(await api.listVoiceRecipes()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const format = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - startedAtRef.current) / 1000;
        setPreviewAudio({ blob, url, duration });
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = mr;
      startedAtRef.current = Date.now();
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      toast({ title: 'Microphone access denied', description: 'Please allow microphone permission to record.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setRecording(false);
    }
  };

  const discardPreview = () => {
    if (previewAudio?.url) URL.revokeObjectURL(previewAudio.url);
    setPreviewAudio(null);
    setSeconds(0);
  };

  const openSaveModal = () => {
    setSaveMeta({ title: '', author: 'You', language_code: 'unknown' });
    setShowSaveModal(true);
  };

  const uploadRecording = async () => {
    if (!previewAudio || !saveMeta.title.trim()) {
      toast({ title: 'Title required' });
      return;
    }
    setProcessing(true);
    setShowSaveModal(false);
    try {
      const file = new File([previewAudio.blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      const saved = await api.uploadVoiceRecipe(file, {
        title: saveMeta.title,
        author: saveMeta.author,
        language_code: saveMeta.language_code,
        duration: previewAudio.duration,
      });
      setRecordings(prev => [saved, ...prev]);
      toast({ title: 'Recording saved!', description: saved.transcript ? 'Transcript is ready.' : 'Saved. Transcript may take a moment.' });
      discardPreview();
    } catch (e) {
      toast({ title: 'Upload failed', description: e?.response?.data?.detail || e?.message || 'Please try again.' });
    } finally { setProcessing(false); }
  };

  const removeRecording = async (id) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    try { await api.deleteVoiceRecipe(id); } catch { load(); }
  };

  return (
    <AppShell active="voice">
      <div className="px-8 py-6">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Voice Recipes</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Record recipes in your family’s own voice — we’ll transcribe and translate them.</p>

        <div className="mt-8 max-w-2xl bg-white rounded-3xl border border-neutral-200/70 p-10 text-center">
          {!previewAudio ? (
            <>
              <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center transition-all ${recording ? 'bg-[#FBE3D2] animate-soft-pulse' : 'bg-[#F5EDDD]'}`}>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${recording ? 'bg-terracotta' : 'bg-cumin-green'}`}
                  aria-label={recording ? 'Stop recording' : 'Start recording'}
                >
                  {recording ? <Square size={26} className="text-white" fill="currentColor" /> : <Mic size={30} className="text-white" />}
                </button>
              </div>
              <p className="font-serif-display text-[32px] font-semibold text-neutral-900 mt-6">{format(seconds)}</p>
              <p className="text-[13.5px] text-neutral-500 mt-2">{recording ? 'Recording… speak clearly and naturally.' : 'Tap the microphone to start recording.'}</p>
              <div className="mt-8 flex items-center justify-center gap-[3px] h-14">
                {[...Array(40)].map((_, i) => (
                  <div key={i} className={`w-[3px] rounded-full ${recording ? 'bg-terracotta' : 'bg-neutral-300'}`} style={{ height: `${8 + Math.abs(Math.sin(i / 2 + (recording ? seconds / 2 : 0))) * 40}px` }} />
                ))}
              </div>
            </>
          ) : (
            <div>
              <div className="w-20 h-20 mx-auto rounded-full bg-[#DFEAD8] flex items-center justify-center">
                <Mic size={28} className="text-cumin-green" />
              </div>
              <p className="font-serif-display text-[26px] font-semibold text-neutral-900 mt-4">Recording ready</p>
              <p className="text-[13.5px] text-neutral-500 mt-1">Duration: {format(previewAudio.duration)}</p>
              <audio controls src={previewAudio.url} className="mt-4 mx-auto" />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button onClick={discardPreview} disabled={processing} className="px-5 py-2.5 rounded-lg border border-neutral-200 text-neutral-700 hover:border-terracotta hover:text-terracotta transition-colors text-[14px] disabled:opacity-50">Discard</button>
                <button onClick={openSaveModal} disabled={processing} className="px-5 py-2.5 rounded-lg bg-cumin-green text-white text-[14px] font-medium hover:bg-[#324A2F] transition-colors flex items-center gap-2 disabled:opacity-70">
                  <Sparkles size={15} /> Save & Transcribe
                </button>
              </div>
            </div>
          )}

          {processing && (
            <div className="mt-6 flex items-center justify-center gap-2 text-neutral-600 text-[13.5px]">
              <Loader2 size={16} className="animate-spin" /> Transcribing with our AI… (this may take a few seconds)
            </div>
          )}
        </div>

        <h2 className="font-serif-display text-[24px] font-semibold text-neutral-900 mt-10">Your recordings</h2>
        {loading ? (
          <div className="mt-8 flex justify-center"><Loader2 className="animate-spin text-neutral-500" size={22} /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {recordings.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-neutral-200/70 p-5">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelected(r)} className="w-11 h-11 rounded-full bg-[#DFEAD8] flex items-center justify-center hover:scale-105 transition-transform">
                    <Play size={14} className="text-cumin-green ml-0.5" fill="currentColor" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-neutral-900 truncate">{r.title}</p>
                    <p className="text-[12px] text-neutral-500">By {r.author} · {r.duration} · {r.language}</p>
                  </div>
                  <button onClick={() => removeRecording(r.id)} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400"><Trash2 size={15} /></button>
                </div>
                {r.transcript && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <p className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase">Transcript</p>
                    <p className="text-[13.5px] text-neutral-800 mt-1 line-clamp-3">{r.transcript}</p>
                    {r.transcript_en && r.transcript_en !== r.transcript && (
                      <>
                        <p className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase mt-3">English translation</p>
                        <p className="text-[13.5px] text-neutral-700 mt-1 line-clamp-3 italic">{r.transcript_en}</p>
                      </>
                    )}
                    <button onClick={() => setSelected(r)} className="text-[12px] text-cumin-green font-medium hover:underline mt-2">Read full</button>
                  </div>
                )}
                {r.error && <p className="mt-3 text-[12px] text-terracotta">Transcription failed: {r.error}</p>}
              </div>
            ))}
            {recordings.length === 0 && <div className="col-span-full text-center py-12 text-neutral-500">No recordings yet. Tap the mic to add your first one.</div>}
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setShowSaveModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-display text-[24px] font-semibold">Save recording</h3>
              <button type="button" onClick={() => setShowSaveModal(false)} className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Title (e.g., Paati’s Sambar)" value={saveMeta.title} onChange={e => setSaveMeta({...saveMeta, title: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" autoFocus />
              <input placeholder="Speaker" value={saveMeta.author} onChange={e => setSaveMeta({...saveMeta, author: e.target.value})} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green" />
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                <select value={saveMeta.language_code} onChange={e => setSaveMeta({...saveMeta, language_code: e.target.value})} className="w-full appearance-none border border-neutral-200 rounded-lg pl-9 pr-3 py-2.5 text-[14px] focus:outline-none focus:border-cumin-green">
                  {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <p className="text-[12px] text-neutral-500">We’ll transcribe using our AI and translate to English  if needed.</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 border border-neutral-200 py-3 rounded-lg text-[14px] text-neutral-700 hover:border-neutral-400 transition-colors">Cancel</button>
              <button onClick={uploadRecording} className="flex-1 bg-cumin-green text-white py-3 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors">Save & Transcribe</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif-display text-[26px] font-semibold">{selected.title}</h3>
                <p className="text-[13px] text-neutral-500 mt-0.5">By {selected.author} · {selected.duration} · {selected.language}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={16} /></button>
            </div>
            {selected.transcript ? (
              <>
                <p className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase">Transcript</p>
                <p className="text-[15px] text-neutral-800 mt-1 whitespace-pre-wrap leading-relaxed">{selected.transcript}</p>
                {selected.transcript_en && selected.transcript_en !== selected.transcript && (
                  <>
                    <p className="text-[11px] font-semibold text-neutral-500 tracking-wide uppercase mt-5">English translation</p>
                    <p className="text-[15px] text-neutral-700 mt-1 whitespace-pre-wrap leading-relaxed italic">{selected.transcript_en}</p>
                  </>
                )}
              </>
            ) : (
              <p className="text-neutral-500">No transcript available.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
