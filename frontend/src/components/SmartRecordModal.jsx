import React, { useState, useRef } from 'react';
import { X, Mic, Square, Loader2, Sparkles, ChefHat, BookOpen, PartyPopper, Share2 } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/use-toast';

const KINDS = [
  { key: 'recipe',   label: 'Recipe',    icon: ChefHat,     tint: 'bg-[#FBE3D2]', ic: 'text-terracotta',    desc: 'A cooking recipe — ingredients, steps, servings.' },
  { key: 'story',    label: 'Story',     icon: BookOpen,    tint: 'bg-[#DFEAD8]', ic: 'text-[#5D7A4E]',      desc: 'A family memory, a tradition, a life lesson.' },
  { key: 'festival', label: 'Festival',  icon: PartyPopper, tint: 'bg-[#E4DEF4]', ic: 'text-[#7A6FB0]',      desc: 'A festival ritual, prayer, or celebration story.' },
];

const PROC_MESSAGES = {
  recipe: [
    '🫙 Popping open your family jar…',
    '👂 Listening to every word carefully…',
    '📝 Writing it down in English…',
    '🌶️ Sorting the ingredients…',
    '⏱️ Estimating the cooking time…',
    '🍽️ Deciding how many hungry people it will feed…',
    '🎨 Drawing a little cover for it…',
    '💌 Almost ready to preserve forever…',
  ],
  story: [
    '🫙 Popping open your family jar…',
    '👂 Listening to every word carefully…',
    '📝 Writing it down in English…',
    '📖 Turning it into a beautiful memory…',
    '💌 Almost ready to preserve forever…',
  ],
  festival: [
    '🫙 Popping open your family jar…',
    '👂 Listening to every word carefully…',
    '🪔 Capturing the festival spirit…',
    '📝 Writing it down in English…',
    '💌 Almost ready to preserve forever…',
  ],
};

function ProcessingView({ kind }) {
  const messages = PROC_MESSAGES[kind] || PROC_MESSAGES.story;
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2400);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div className="text-center py-12">
      <Loader2 className="animate-spin text-cumin-green mx-auto" size={30} />
      <p className="mt-5 text-[15.5px] font-semibold text-neutral-900 min-h-[24px]">{messages[idx]}</p>
      <p className="text-[12.5px] text-neutral-500 mt-1">Hold tight — this can take 20 – 40 seconds.</p>
    </div>
  );
}

export default function SmartRecordModal({ onClose, familyId, onSaved }) {
  const [step, setStep] = useState('choose'); // choose | record | processing | done
  const [kind, setKind] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const streamRef = useRef(null);
  const uploadingRef = useRef(false);
  const { toast } = useToast();

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const chooseKind = (k) => { setKind(k); setStep('record'); };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await upload(blob);
      };
      mrRef.current = mr;
      startedAtRef.current = Date.now();
      mr.start();
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      toast({ title: 'Microphone denied', description: 'Please allow microphone permission.' });
    }
  };

  const stopRecording = () => {
    if (mrRef.current && mrRef.current.state === 'recording') {
      mrRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  const upload = async (blob) => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setStep('processing');
    try {
      const fd = new FormData();
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      fd.append('file', file, file.name);
      fd.append('kind', kind);
      fd.append('media_kind', 'audio');
      if (familyId) fd.append('family_id', familyId);
      fd.append('generate_image', kind === 'recipe' ? 'true' : 'false');
      const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/smart-record`, {
        method: 'POST', body: fd,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Upload failed');
      }
      const data = await r.json();
      setResult(data);
      setStep('done');
      onSaved && onSaved(data);
      toast({ title: `${kind === 'recipe' ? 'Recipe' : kind === 'festival' ? 'Festival memory' : 'Story'} saved!` });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.' });
      setStep('record');
      uploadingRef.current = false;
    }
  };

  const shareOnWhatsApp = () => {
    if (!result?.item) return;
    const item = result.item;
    const title = item.title;
    const body = kind === 'recipe' && item.ingredients?.length
      ? `${title}\n\nIngredients:\n${(item.ingredients || []).map(i => `• ${i}`).join('\n')}\n\nSteps:\n${(item.steps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nSaved on CuminJar 🫙`
      : `${title}\n\n${(item.transcript_en || item.excerpt || '').slice(0, 800)}\n\nSaved on CuminJar 🫙`;
    const url = `https://wa.me/?text=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h3 className="font-serif-display text-[22px] font-semibold">
            {step === 'choose' && 'What are you preserving?'}
            {step === 'record' && `Record a ${kind}`}
            {step === 'processing' && 'AI is working…'}
            {step === 'done' && 'Saved!'}
          </h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center"><X size={18} /></button>
        </div>

        <div className="px-5 py-6">
          {step === 'choose' && (
            <div className="space-y-3">
              <p className="text-[14px] text-neutral-600 mb-3">Pick a type. Then just talk in any language — we handle the rest.</p>
              {KINDS.map(k => (
                <button key={k.key} onClick={() => chooseKind(k.key)} className="w-full flex items-center gap-4 border border-neutral-200 hover:border-cumin-green rounded-2xl p-4 text-left transition-colors">
                  <div className={`w-12 h-12 rounded-full ${k.tint} flex items-center justify-center`}>
                    <k.icon size={22} className={k.ic} />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">{k.label}</p>
                    <p className="text-[13px] text-neutral-500">{k.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'record' && (
            <div className="text-center py-6">
              <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all ${mrRef.current?.state === 'recording' ? 'bg-[#FBE3D2] animate-soft-pulse' : 'bg-[#F5EDDD]'}`}>
                {mrRef.current?.state === 'recording' ? (
                  <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-terracotta flex items-center justify-center shadow-xl">
                    <Square size={26} className="text-white" fill="currentColor" />
                  </button>
                ) : (
                  <button onClick={startRecording} className="w-20 h-20 rounded-full bg-cumin-green flex items-center justify-center shadow-xl">
                    <Mic size={30} className="text-white" />
                  </button>
                )}
              </div>
              <p className="font-serif-display text-[36px] font-semibold text-neutral-900 mt-6">{fmt(seconds)}</p>
              <p className="text-[13px] text-neutral-500 mt-2">
                {mrRef.current?.state === 'recording' ? 'Recording… tap to stop.' : `Tap the mic and start telling your ${kind}.`}
              </p>
              <p className="text-[12px] text-neutral-400 mt-4">Speak in any Indian language — our AI transcribes, Google translates.</p>
            </div>
          )}

          {step === 'processing' && <ProcessingView kind={kind} />}

          {step === 'done' && result?.item && (
            <div>
              {result.item.cover && (
                <img src={result.item.cover} alt="cover" className="w-full aspect-video object-cover rounded-xl mb-3" />
              )}
              <h4 className="font-serif-display text-[24px] font-semibold text-neutral-900">{result.item.title}</h4>
              {kind === 'recipe' && (
                <div className="text-[12.5px] text-neutral-500 mt-1 flex flex-wrap gap-2">
                  {result.item.serves && <span>Serves {result.item.serves}</span>}
                  {result.item.time && <span>• {result.item.time}</span>}
                  {result.item.region && <span>• {result.item.region}</span>}
                </div>
              )}
              {kind === 'recipe' && result.item.ingredients?.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Ingredients</p>
                  <ul className="mt-1 space-y-0.5 text-[13.5px] text-neutral-800">
                    {result.item.ingredients.slice(0, 8).map((i, idx) => <li key={idx}>• {i}</li>)}
                  </ul>
                </>
              )}
              {kind === 'recipe' && result.item.steps?.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Steps</p>
                  <ol className="mt-1 space-y-1 text-[13.5px] text-neutral-800 list-decimal list-inside">
                    {result.item.steps.slice(0, 6).map((s, idx) => <li key={idx}>{s}</li>)}
                  </ol>
                </>
              )}
              {kind !== 'recipe' && (
                <p className="mt-3 text-[14px] text-neutral-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">{result.item.excerpt || result.item.transcript_en}</p>
              )}

              <div className="mt-6 flex gap-2">
                <button onClick={shareOnWhatsApp} className="flex-1 bg-[#25D366] text-white py-3 rounded-lg text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#1EBE5B] transition-colors">
                  <Share2 size={15} /> Share on WhatsApp
                </button>
                <button onClick={onClose} className="flex-1 bg-cumin-green text-white py-3 rounded-lg text-[14px] font-semibold hover:bg-[#324A2F] transition-colors">Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
