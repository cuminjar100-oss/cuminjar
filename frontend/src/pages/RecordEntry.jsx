import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth, formatApiError } from "@/context/AuthContext";
import * as appData from "@/lib/appData";
import Header from "@/components/Header";
import { ArrowLeft, Mic, StopCircle, Send, RefreshCw, MicOff } from "lucide-react";

// Pick a MIME type the current browser actually supports.
// Order matters: Chrome/Firefox prefer webm/opus; Safari only does mp4/aac.
function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/aac",
  ];
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {}
  }
  return ""; // empty = let browser choose
}

export default function RecordEntry() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState("recipe");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitState, setSubmitState] = useState("idle");
  const [error, setError] = useState(null);
  const [permDenied, setPermDenied] = useState(false);
  const [supported, setSupported] = useState(true);
  const [inIframe, setInIframe] = useState(false);
  const [meter, setMeter] = useState(0); // 0..1 live mic level

  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  // Keep the most recent blob URL in a ref so unmount cleanup can revoke it
  // without relying on stale state captured at mount time.
  const audioUrlRef = useRef(null);

  // Web Audio meter
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const meterRafRef = useRef(null);

  useEffect(() => {
    if (typeof MediaRecorder === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setSupported(false);
    }
    // Detect iframe — getUserMedia inside an iframe needs `allow="microphone"` on the parent
    try { if (window.self !== window.top) setInIframe(true); } catch { setInIframe(true); }
    // Proactively check permission state so we can show a helpful banner up front
    (async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const p = await navigator.permissions.query({ name: "microphone" });
          if (p.state === "denied") setPermDenied(true);
          p.onchange = () => { if (p.state === "denied") setPermDenied(true); else setPermDenied(false); };
        }
      } catch { /* ignore — Safari sometimes lacks Permissions API */ }
    })();
    (async () => {
      if (!user) return;
      try { setBook(await appData.getVault(user, vaultId)); }
      catch { navigate("/", { replace: true }); }
    })();
  }, [vaultId, navigate, user]);

  // Mirror audioUrl into a ref so unmount cleanup can always reach the latest value
  useEffect(() => { audioUrlRef.current = audioUrl; }, [audioUrl]);

  useEffect(() => () => { cleanupOnUnmount(); /* eslint-disable-next-line */ }, []);

  const cleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (meterRafRef.current) { cancelAnimationFrame(meterRafRef.current); meterRafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    // NOTE: do NOT revoke audioUrl here — it's still needed for the preview <audio> element
    // after the recorder stops. The unmount-only revoke lives in cleanupOnUnmount() below.
  };

  const cleanupOnUnmount = () => {
    cleanup();
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; }
  };

  const startMeter = (stream) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        // RMS → 0..1
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setMeter(Math.min(1, rms * 2.6)); // boosted so quiet voice still moves the bar
        meterRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { /* meter is optional */ }
  };

  const start = async () => {
    setError(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); setAudioBlob(null); }
    if (!supported) {
      setError("Your browser doesn't support recording. Try Chrome, Safari (iOS 14.3+), or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mime = pickMimeType();
      const opts = mime ? { mimeType: mime } : undefined;
      let mr;
      try { mr = new MediaRecorder(stream, opts); }
      catch (e) { mr = new MediaRecorder(stream); }
      mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onerror = (e) => {
        setError("Recording error: " + (e?.error?.message || "unknown"));
      };
      mr.onstop = () => {
        const type = chunksRef.current[0]?.type || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        cleanup();
      };
      // Start with a 1-second timeslice — guarantees data is flushed even if user stops quickly.
      mr.start(1000);
      startMeter(stream);
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        setPermDenied(true);
        setError(null);
      } else if (name === "NotFoundError") {
        setError("No microphone found on this device.");
      } else {
        setError("We couldn't start recording: " + (e?.message || name || "unknown error"));
      }
    }
  };

  const stop = () => {
    try { mrRef.current?.requestData?.(); } catch {}
    try { if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop(); } catch {}
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (meterRafRef.current) { cancelAnimationFrame(meterRafRef.current); meterRafRef.current = null; }
    setRecording(false); setMeter(0);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null); setElapsed(0); setError(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!audioBlob || !title.trim()) return;
    setSubmitState("uploading"); setError(null);
    try {
      const fd = new FormData();
      const type = audioBlob.type || "audio/webm";
      // Map mime to a sensible filename extension so the backend's whisper handler picks it up.
      const ext = type.includes("mp4") ? "m4a"
                : type.includes("mpeg") ? "mp3"
                : type.includes("ogg") ? "ogg"
                : type.includes("wav") ? "wav"
                : "webm";
      fd.append("audio", audioBlob, `recording.${ext}`);
      fd.append("title", title.trim());
      fd.append("entry_type", entryType);
      const { data } = await api.post(`/vaults/${vaultId}/entries/audio`, fd, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 240000,
      });
      navigate(`/entries/${data.entry_id}`, { replace: true });
    } catch (err) {
      setSubmitState("error");
      setError(formatApiError(err, "Something went wrong saving the entry."));
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-[#FDFBF7]" data-testid="record-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-10">
        <Link to={`/vaults/${vaultId}`} className="inline-flex items-center gap-2 text-[#5B6359] hover:text-[#D96C4A] mb-6" data-testid="record-back-link">
          <ArrowLeft size={18} /> Back to {book?.name || "vault"}
        </Link>

        <header className="mb-8 animate-fadeUp">
          <p className="uppercase tracking-[0.3em] text-xs text-[#8C857B] mb-2">A new entry — for the family vault</p>
          <h1 className="font-display text-4xl sm:text-5xl text-[#2C302B] leading-tight">
            Just <span className="text-[#D96C4A]">talk</span> through it.
          </h1>
          <p className="text-[#5B6359] mt-3 leading-relaxed">
            Speak in <strong>any language</strong>. We'll save your voice and turn it into step-by-step English cards.
          </p>
        </header>

        {!supported && (
          <div data-testid="record-unsupported" className="mb-6 bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl p-5 flex items-start gap-3">
            <MicOff className="text-[#B54A4A] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-[#2C302B]">Your browser can't record audio.</p>
              <p className="text-sm text-[#5B6359] mt-1">
                Try the latest Chrome, Safari (iOS 14.3+ or macOS), or Firefox. On iPhone make sure you're in Safari, not in-app browsers like Instagram.
              </p>
            </div>
          </div>
        )}

        {permDenied && (
          <div data-testid="record-mic-denied" className="mb-6 bg-[#FFF3E0] border-2 border-[#D9A05B]/40 rounded-2xl p-5 sm:p-6 animate-fadeUp">
            <div className="flex items-start gap-3 mb-4">
              <MicOff className="text-[#D96C4A] flex-shrink-0 mt-0.5" size={22} />
              <div>
                <p className="font-display text-xl text-[#2C302B] leading-tight">Microphone is blocked for this site.</p>
                <p className="text-sm text-[#5B6359] mt-1">
                  Your browser is refusing to give us mic access. Here's how to fix it — takes about 10 seconds:
                </p>
              </div>
            </div>

            {inIframe && (
              <div className="bg-[#FDFBF7] border border-[#D9A05B]/30 rounded-2xl p-4 mb-4">
                <p className="text-sm font-semibold text-[#2C302B] mb-1">⚡ Quickest fix — open in a new tab</p>
                <p className="text-sm text-[#5B6359] mb-3">
                  You're viewing this inside a preview frame, which often blocks microphone access. Open the app in its own tab and the mic will work.
                </p>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="record-open-new-tab"
                  className="btn-press inline-flex items-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
                >
                  Open in a new tab →
                </a>
              </div>
            )}

            <div className="bg-[#FDFBF7] border border-[#D9A05B]/30 rounded-2xl p-4 mb-3">
              <p className="text-sm font-semibold text-[#2C302B] mb-2">Chrome / Edge / Brave</p>
              <ol className="text-sm text-[#5B6359] space-y-1 list-decimal pl-5">
                <li>Click the <strong>🔒 lock icon</strong> on the left of the address bar.</li>
                <li>Set <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                <li>Reload this page and try again.</li>
              </ol>
            </div>

            <div className="bg-[#FDFBF7] border border-[#D9A05B]/30 rounded-2xl p-4 mb-3">
              <p className="text-sm font-semibold text-[#2C302B] mb-2">Safari (Mac)</p>
              <ol className="text-sm text-[#5B6359] space-y-1 list-decimal pl-5">
                <li>Top menu: <strong>Safari → Settings → Websites → Microphone</strong>.</li>
                <li>Find this site and switch it to <strong>Allow</strong>.</li>
                <li>Reload this page.</li>
              </ol>
            </div>

            <div className="bg-[#FDFBF7] border border-[#D9A05B]/30 rounded-2xl p-4">
              <p className="text-sm font-semibold text-[#2C302B] mb-2">iPhone Safari</p>
              <ol className="text-sm text-[#5B6359] space-y-1 list-decimal pl-5">
                <li>Tap the <strong>"AA"</strong> button in the address bar.</li>
                <li>Tap <strong>Website Settings → Microphone → Allow</strong>.</li>
                <li>Also check iOS <strong>Settings → Safari → Microphone</strong> is set to <em>Ask</em> or <em>Allow</em>.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={() => { setPermDenied(false); start(); }}
              data-testid="record-retry-button"
              className="btn-press w-full mt-4 inline-flex items-center justify-center gap-2 bg-[#5B7053] hover:bg-[#4a5c45] text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
            >
              I've allowed it — try again
            </button>
          </div>
        )}

        <form onSubmit={submit} className="bg-[#F6F3EB] rounded-3xl p-6 sm:p-8 border border-[#8C857B]/15 space-y-6 animate-fadeUp">
          <div>
            <span className="block text-xs uppercase tracking-wide text-[#8C857B] font-semibold mb-3">What are you capturing?</span>
            <div data-testid="entry-type-picker" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "recipe",   label: "Recipe",   hint: "Ingredients + steps" },
                { id: "ritual",   label: "Ritual",   hint: "Pooja, ceremony" },
                { id: "festival", label: "Festival", hint: "Diwali, Pongal…" },
                { id: "song",     label: "Song",     hint: "Lullaby, blessing" },
              ].map((t) => (
                <button
                  key={t.id} type="button"
                  data-testid={`entry-type-${t.id}`}
                  onClick={() => setEntryType(t.id)}
                  className={`btn-press text-left rounded-2xl border-2 px-4 py-3 transition-all ${
                    entryType === t.id
                      ? "bg-[#D96C4A] border-[#D96C4A] text-white shadow-md"
                      : "bg-white border-[#8C857B]/20 text-[#2C302B] hover:border-[#D96C4A]/50"
                  }`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className={`text-xs mt-0.5 ${entryType === t.id ? "text-white/80" : "text-[#8C857B]"}`}>{t.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-[#8C857B] font-semibold mb-2">
              {entryType === "recipe" && "Recipe name"}
              {entryType === "ritual" && "Ritual name"}
              {entryType === "festival" && "Festival name"}
              {entryType === "song" && "Song / blessing name"}
            </span>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder={
                entryType === "recipe" ? "e.g. Grandma Rose's sourdough"
                : entryType === "ritual" ? "e.g. Griha Pravesh pooja"
                : entryType === "festival" ? "e.g. Pongal at home"
                : "e.g. Thalattu / Lullaby"
              }
              data-testid="record-title-input"
              className="w-full bg-white border-2 border-[#8C857B]/20 rounded-2xl px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B]"
            />
          </label>

          <div className="bg-white rounded-3xl border-2 border-dashed border-[#D96C4A]/30 p-6 sm:p-10 text-center">
            {!audioBlob && !recording && (
              <>
                <button type="button" onClick={start} disabled={!supported} data-testid="record-start-button"
                  className="btn-press inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#D96C4A] hover:bg-[#C05A3A] text-white shadow-[0_12px_30px_rgba(217,108,74,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <Mic size={36} />
                </button>
                <p className="text-sm text-[#8C857B] mt-4">Tap to start recording</p>
              </>
            )}
            {recording && (
              <div>
                <button type="button" onClick={stop} data-testid="record-stop-button"
                  className="btn-press inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#B54A4A] hover:bg-[#993E3E] text-white shadow-[0_12px_30px_rgba(181,74,74,0.4)] transition-all relative">
                  <StopCircle size={36} />
                  <span className="absolute -inset-2 rounded-full border-4 border-[#B54A4A]/30 animate-ping" />
                </button>
                <p className="font-display text-2xl text-[#2C302B] mt-5">{fmtTime(elapsed)}</p>
                <div className="mt-3 mx-auto max-w-xs">
                  <div data-testid="record-meter" className="h-2.5 w-full bg-[#F6F3EB] rounded-full overflow-hidden border border-[#8C857B]/15">
                    <div
                      className="h-full bg-gradient-to-r from-[#5B7053] via-[#D9A05B] to-[#D96C4A] transition-[width] duration-75"
                      style={{ width: `${Math.round(meter * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#8C857B] mt-2">
                    {meter < 0.04 ? "Speak a little louder — we can barely hear you." : "Listening… tap stop when you're done."}
                  </p>
                </div>
              </div>
            )}
            {audioBlob && !recording && (
              <div className="space-y-4">
                <p className="text-sm text-[#5B6359]">Recorded {fmtTime(elapsed)} — give it a listen.</p>
                <audio data-testid="record-preview-audio" src={audioUrl} controls className="w-full" />
                <button type="button" onClick={reset} data-testid="record-redo-button"
                  className="btn-press inline-flex items-center gap-2 bg-white border-2 border-[#8C857B]/20 text-[#2C302B] rounded-full px-5 py-2.5 font-semibold hover:bg-[#F6F3EB] transition-all">
                  <RefreshCw size={16} /> Record again
                </button>
              </div>
            )}
          </div>

          {error && (
            <p data-testid="record-error" className="text-sm text-[#B54A4A] bg-[#B54A4A]/10 border-2 border-[#B54A4A]/30 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={!audioBlob || !title.trim() || submitState === "uploading"}
            data-testid="record-submit-button"
            className="btn-press w-full inline-flex items-center justify-center gap-2 bg-[#D96C4A] hover:bg-[#C05A3A] text-white rounded-full px-7 py-4 font-semibold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {submitState === "uploading" ? (
              <>
                <span className="w-5 h-5 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                Saving the entry…
              </>
            ) : (<><Send size={18} /> Save to {book?.name || "vault"}</>)}
          </button>
          {submitState === "uploading" && (
            <p className="text-center text-sm text-[#8C857B]">
              We're listening to your recording and writing it out — this can take up to a minute.
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
