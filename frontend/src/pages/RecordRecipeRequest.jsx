import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic, Square, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import api from '../api';

// Public page rendered when the target of a WhatsApp recipe request taps the
// wa.me link. No login required. They see who's asking, hit the big red
// button, record a voice note, and CuminJar transcribes + saves the recipe
// to the requester's family jar.
export default function RecordRecipeRequest() {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('loading'); // loading | ready | recording | preview | uploading | done | error
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioBlobRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await api.getRecipeRequestPublic(token);
        setMeta(m);
        setPhase(m.status === 'completed' ? 'done' : 'ready');
      } catch (err) {
        setError(err?.response?.data?.detail || 'This recipe request is no longer active.');
        setPhase('error');
      }
    })();
    return () => {
      try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token]);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: getSupportedMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('preview');
      };
      rec.start(500);
      recorderRef.current = rec;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setPhase('recording');
    } catch (err) {
      setError('We need microphone access to record. Please tap the mic icon in your browser and allow, then try again.');
      setPhase('error');
    }
  };

  const stopRecording = () => {
    try { recorderRef.current?.stop(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const resetRecording = () => {
    audioBlobRef.current = null;
    setAudioUrl(null);
    setSeconds(0);
    setPhase('ready');
  };

  const submit = async () => {
    if (!audioBlobRef.current) return;
    setPhase('uploading');
    try {
      const fd = new FormData();
      fd.append('audio', audioBlobRef.current, `whatsapp-recipe-${Date.now()}.webm`);
      await api.submitRecipeRequest(token, fd);
      setPhase('done');
    } catch (err) {
      setError(err?.response?.data?.detail || 'We couldn\'t save that recording. Please try again.');
      setPhase('error');
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-neutral-200/70 overflow-hidden" data-testid="record-request-card">
        {/* Header */}
        <div className="bg-[#F7EFE1] px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white mx-auto flex items-center justify-center text-2xl">🫙</div>
          <p className="mt-4 text-[11px] tracking-[0.14em] text-terracotta font-semibold uppercase">A voice note request</p>
          {meta ? (
            <>
              <h1 className="mt-1 font-serif-display text-[26px] font-semibold text-neutral-900 leading-snug">
                <b>{meta.requester_name}</b> wants your <span className="text-terracotta italic">{meta.dish_name}</span> notes
              </h1>
              <p className="mt-2 text-[13.5px] text-neutral-600">A recipe, a story, a tradition &mdash; whatever it is, they want to save it forever.</p>
            </>
          ) : (
            <div className="mt-4"><Loader2 className="animate-spin text-neutral-400 mx-auto" size={20} /></div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {phase === 'loading' && (
            <div className="text-center py-6"><Loader2 className="animate-spin text-neutral-400 mx-auto" size={20} /></div>
          )}

          {phase === 'error' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#FDECEA] text-red-700 flex items-center justify-center mx-auto"><AlertTriangle size={20} /></div>
              <p className="mt-3 text-[14.5px] text-neutral-800">{error}</p>
              {meta && <button onClick={() => { setError(''); setPhase('ready'); }} data-testid="record-retry" className="mt-4 text-cumin-green underline text-[13px]">Try again</button>}
            </div>
          )}

          {phase === 'done' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#DFEAD8] text-cumin-green flex items-center justify-center mx-auto"><CheckCircle2 size={24} /></div>
              <p className="mt-3 font-medium text-neutral-900 text-[16px]">Thank you 💛</p>
              <p className="text-[13.5px] text-neutral-600 mt-1 leading-relaxed">
                Your voice note is now safely in {meta?.requester_name || 'their'} family jar &mdash; forever.
              </p>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <p className="text-[14px] text-neutral-700 text-center leading-relaxed">
                Tap the mic and share it just like you&rsquo;d tell {meta?.requester_name || 'them'} &mdash; in any language. CuminJar handles the rest.
              </p>
              <button
                type="button"
                onClick={startRecording}
                data-testid="record-start"
                className="mt-6 w-full flex items-center justify-center gap-2 bg-terracotta text-white py-4 rounded-2xl font-medium hover:bg-[#A85736] transition-colors text-[15.5px]"
              >
                <Mic size={18} /> Hold to record
              </button>
              <p className="mt-4 text-center text-[11.5px] text-neutral-500">Recording is private. Only {meta?.requester_name || 'the person who invited you'} can see it.</p>
            </>
          )}

          {phase === 'recording' && (
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-red-500 mx-auto flex items-center justify-center animate-pulse">
                <Mic size={36} className="text-white" />
              </div>
              <p className="mt-4 font-mono text-[28px] text-neutral-900">{mmss}</p>
              <p className="mt-1 text-[12.5px] text-neutral-500">Speak naturally &mdash; take your time.</p>
              <button
                type="button"
                onClick={stopRecording}
                data-testid="record-stop"
                className="mt-5 inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors"
              >
                <Square size={14} /> Stop recording
              </button>
            </div>
          )}

          {phase === 'preview' && (
            <div className="text-center">
              <p className="text-[13.5px] text-neutral-600 mb-3">Listen back before you send it forever</p>
              {audioUrl && <audio controls src={audioUrl} className="w-full" data-testid="record-preview-audio" />}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={resetRecording}
                  data-testid="record-reset"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-neutral-200 text-neutral-800 py-3 rounded-lg text-[13.5px] font-medium hover:bg-neutral-50 transition-colors"
                >
                  <RotateCcw size={14} /> Redo
                </button>
                <button
                  type="button"
                  onClick={submit}
                  data-testid="record-submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-cumin-green text-white py-3 rounded-lg text-[13.5px] font-medium hover:bg-[#324A2F] transition-colors"
                >
                  Send to CuminJar
                </button>
              </div>
            </div>
          )}

          {phase === 'uploading' && (
            <div className="text-center py-6">
              <Loader2 className="animate-spin text-cumin-green mx-auto" size={26} />
              <p className="mt-3 text-[14px] text-neutral-800">Saving your voice note…</p>
              <p className="text-[12px] text-neutral-500 mt-1">Transcribing + structuring. Takes about 20 seconds.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 text-center">
          <p className="text-[11px] text-neutral-500">Powered by CuminJar &middot; <a href="/" className="underline hover:text-cumin-green">cuminjar.com</a></p>
        </div>
      </div>
    </div>
  );
}

function getSupportedMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const c of candidates) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
  return '';
}
