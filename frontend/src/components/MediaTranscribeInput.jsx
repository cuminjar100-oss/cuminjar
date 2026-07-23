import React, { useState, useRef } from 'react';
import { Mic, Square, Camera, Loader2, Sparkles, X, Volume2, Globe } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

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

/**
 * Reusable media transcription widget for Recipes / Stories.
 * Props:
 *   onTranscribed(result) -> called with {transcript, transcript_en, language, kind}
 */
export default function MediaTranscribeInput({ onTranscribed }) {
  const [mode, setMode] = useState('idle'); // idle | recording | preview | processing | done
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [language, setLanguage] = useState('unknown');
  const [result, setResult] = useState(null);
  const [kindDone, setKindDone] = useState(null);

  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const startedAtRef = useRef(0);
  const { toast } = useToast();

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        setMode('preview');
      };
      mrRef.current = mr;
      startedAtRef.current = Date.now();
      mr.start();
      setSeconds(0);
      setMode('recording');
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      toast({ title: 'Microphone denied', description: 'Please allow microphone permission.' });
    }
  };

  const stopRecording = () => {
    if (mrRef.current && mode === 'recording') {
      mrRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  const handlePhoto = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(f);
    setMode('preview');
  };

  const discard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl('');
    setPhotoFile(null); setPhotoPreview('');
    setResult(null); setKindDone(null);
    setSeconds(0);
    setMode('idle');
  };

  const transcribe = async () => {
    setMode('processing');
    try {
      let file, kind;
      if (audioBlob) {
        file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        kind = 'audio';
      } else if (photoFile) {
        file = photoFile;
        kind = 'photo';
      } else {
        toast({ title: 'Nothing to transcribe' });
        setMode('idle');
        return;
      }
      const res = await api.transcribeMedia(file, kind, language);
      setResult(res);
      setKindDone(kind);
      setMode('done');
      if (res.error && !res.transcript_en) {
        toast({ title: 'Transcription issue', description: res.error });
      } else {
        toast({ title: 'Transcribed to English!' });
        onTranscribed && onTranscribed({ ...res, kind });
      }
    } catch (err) {
      toast({ title: 'Transcription failed', description: err?.response?.data?.detail || err?.message || 'Please try again.' });
      setMode('preview');
    }
  };

  return (
    <div className="border border-neutral-200 rounded-xl bg-[#FBF6EE] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-neutral-800 flex items-center gap-1.5">
          <Sparkles size={14} className="text-terracotta" /> AI transcription — voice or photo
        </p>
        {(mode === 'preview' || mode === 'done') && (
          <button type="button" onClick={discard} className="text-[12px] text-neutral-500 hover:text-terracotta transition-colors flex items-center gap-1"><X size={13}/> Reset</button>
        )}
      </div>

      {mode === 'idle' && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={startRecording} className="flex flex-col items-center justify-center gap-2 bg-white border border-neutral-200 rounded-lg py-4 hover:border-cumin-green transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#FBE3D2] flex items-center justify-center"><Mic size={18} className="text-terracotta" /></div>
            <span className="text-[13px] font-medium text-neutral-800">Record voice</span>
            <span className="text-[11px] text-neutral-500">Any language</span>
          </button>
          <label className="flex flex-col items-center justify-center gap-2 bg-white border border-neutral-200 rounded-lg py-4 hover:border-cumin-green transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-[#DFEAD8] flex items-center justify-center"><Camera size={18} className="text-cumin-green" /></div>
            <span className="text-[13px] font-medium text-neutral-800">Upload photo</span>
            <span className="text-[11px] text-neutral-500">Handwritten pages</span>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>
        </div>
      )}

      {mode === 'recording' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FBE3D2] animate-soft-pulse flex items-center justify-center">
            <button type="button" onClick={stopRecording} className="w-11 h-11 rounded-full bg-terracotta flex items-center justify-center shadow-lg">
              <Square size={18} className="text-white" fill="currentColor" />
            </button>
          </div>
          <p className="font-serif-display text-[22px] font-semibold text-neutral-900 mt-3">{fmt(seconds)}</p>
          <p className="text-[12px] text-neutral-500">Recording… tap to stop</p>
        </div>
      )}

      {mode === 'preview' && (
        <div>
          {audioUrl && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DFEAD8] flex items-center justify-center"><Volume2 size={16} className="text-cumin-green" /></div>
              <audio controls src={audioUrl} className="flex-1" />
            </div>
          )}
          {photoPreview && (
            <div className="flex items-center gap-3">
              <img src={photoPreview} alt="page" className="w-20 h-20 rounded-lg object-cover" />
              <p className="text-[13px] text-neutral-700">Page photo ready. Add a language and transcribe.</p>
            </div>
          )}
          {audioUrl && (
            <div className="mt-3 relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full appearance-none bg-white border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:border-cumin-green">
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          )}
          <button type="button" onClick={transcribe} className="mt-3 w-full bg-cumin-green text-white py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#324A2F] transition-colors flex items-center justify-center gap-2">
            <Sparkles size={14} /> Transcribe to English
          </button>
        </div>
      )}

      {mode === 'processing' && (
        <div className="text-center py-6">
          <Loader2 className="animate-spin text-cumin-green mx-auto" size={22} />
          <p className="text-[13px] text-neutral-600 mt-2">Transcribing… (our AI)</p>
        </div>
      )}

      {mode === 'done' && result && (
        <div>
          <div className="bg-white border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">English transcript{kindDone === 'photo' ? ' (from photo)' : ''}</p>
            <p className="text-[13.5px] text-neutral-800 mt-1 whitespace-pre-wrap">{result.transcript_en || '(empty)'}</p>
          </div>
          <p className="mt-2 text-[12px] text-cumin-green">✓ Copied into the fields below — feel free to edit.</p>
        </div>
      )}
    </div>
  );
}
