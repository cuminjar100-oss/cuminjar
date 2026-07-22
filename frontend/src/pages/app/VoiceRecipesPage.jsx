import React, { useState } from 'react';
import AppShell from '../../components/AppShell';
import { Mic, Play, Pause, Square, Trash2 } from 'lucide-react';

export default function VoiceRecipesPage() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  React.useEffect(() => {
    let t;
    if (recording) t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const format = (s) => `${String(Math.floor(s/60)).padStart(2, '0')}:${String(s%60).padStart(2, '0')}`;

  return (
    <AppShell active="voice">
      <div className="px-8 py-6">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Voice Recipes</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Record recipes in your family’s own voice.</p>

        <div className="mt-8 max-w-2xl bg-white rounded-3xl border border-neutral-200/70 p-10 text-center">
          <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center transition-all ${recording ? 'bg-[#FBE3D2] animate-soft-pulse' : 'bg-[#F5EDDD]'}`}>
            <button
              onClick={() => { if (!recording) { setSeconds(0); setRecording(true); } else { setRecording(false); } }}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${recording ? 'bg-terracotta' : 'bg-cumin-green'}`}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording ? <Square size={26} className="text-white" fill="currentColor" /> : <Mic size={30} className="text-white" />}
            </button>
          </div>
          <p className="font-serif-display text-[32px] font-semibold text-neutral-900 mt-6">{format(seconds)}</p>
          <p className="text-[13.5px] text-neutral-500 mt-2">{recording ? 'Recording… speak clearly and naturally.' : 'Tap the microphone to start recording.'}</p>

          {/* Waveform mock */}
          <div className="mt-8 flex items-center justify-center gap-[3px] h-14">
            {[...Array(40)].map((_, i) => (
              <div key={i} className={`w-[3px] rounded-full ${recording ? 'bg-terracotta' : 'bg-neutral-300'}`} style={{ height: `${8 + Math.abs(Math.sin(i / 2 + (recording ? seconds/2 : 0))) * 40}px` }} />
            ))}
          </div>
        </div>

        <h2 className="font-serif-display text-[24px] font-semibold text-neutral-900 mt-10">Your recordings</h2>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {[
            { t: "Paati\u2019s Sambar", d: '2:45', by: 'Lakshmi Paati' },
            { t: "Nani\u2019s Rajma Chawal", d: '3:12', by: 'Sunita Nani' },
            { t: "Amma\u2019s Kitchen Wisdom", d: '5:08', by: 'Rukmini Amma' }
          ].map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200/70 p-5 flex items-center gap-4">
              <button className="w-11 h-11 rounded-full bg-[#DFEAD8] flex items-center justify-center"><Play size={14} className="text-cumin-green ml-0.5" fill="currentColor" /></button>
              <div className="flex-1">
                <p className="font-semibold text-[15px] text-neutral-900">{r.t}</p>
                <p className="text-[12px] text-neutral-500">By {r.by} · {r.d}</p>
              </div>
              <button className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
