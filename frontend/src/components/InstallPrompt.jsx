import React, { useEffect, useState, useCallback } from "react";
import { X, Share, Plus, Download } from "lucide-react";

const DISMISS_KEY = "mamascript:install-dismissed-at";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone() {
  // PWA already installed and opened from home screen — don't pester.
  if (typeof window === "undefined") return false;
  // navigator.standalone is iOS-only
  if (window.navigator && window.navigator.standalone === true) return true;
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  // iPad on iOS 13+ reports MacIntel — also check touch.
  return /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in window.document);
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
}

function recentlyDismissed() {
  try {
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    if (!ts) return false;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

/**
 * Mamascript install prompt
 *  - Chrome / Edge / Android: captures the `beforeinstallprompt` event and shows a
 *    small bottom-sheet "Install Mamascript" pill. Tapping it triggers the OS install.
 *  - iOS Safari: shows a brief "Add to Home Screen" sheet with Share→Add instructions
 *    (iOS doesn't fire beforeinstallprompt — users must do it manually).
 *  - Hides itself when already installed (display-mode: standalone), when the user
 *    dismisses it (remembered for 7 days), and on desktop where install is less useful.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState(null); // 'native' | 'ios'

  useEffect(() => {
    if (isStandalone()) return;            // already installed
    if (recentlyDismissed()) return;        // user said "not now"
    if (!isMobile()) return;                // skip on desktop

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setMode("native");
      // delay so we don't ambush a brand-new visitor
      setTimeout(() => setVisible(true), 1500);
    };
    const onAppInstalled = () => {
      // Permanently dismiss — they've installed it. Don't ever show again.
      setVisible(false);
      try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 365 * 24 * 60 * 60 * 1000)); } catch { /* ignore */ }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    // iOS Safari has no install event — show the manual instructions banner after
    // a short pause, but only on iOS Safari (not in-app browsers like Instagram/FB).
    if (isIos()) {
      const ua = window.navigator.userAgent || "";
      const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
      if (isSafari) {
        setMode("ios");
        const t = setTimeout(() => setVisible(true), 2500);
        return () => {
          clearTimeout(t);
          window.removeEventListener("beforeinstallprompt", onBeforeInstall);
          window.removeEventListener("appinstalled", onAppInstalled);
        };
      }
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      else dismiss();
    } catch (_e) {
      dismiss();
    }
  }, [deferred, dismiss]);

  if (!visible) return null;

  return (
    <div
      data-testid="install-prompt"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-4 sm:pb-4 hide-when-installed"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="mx-auto max-w-md rounded-2xl border border-[#E5DDD0] bg-[#FDFBF7] shadow-[0_18px_50px_-12px_rgba(180,75,53,0.35)] overflow-hidden animate-fadeUp">
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0">
            <img
              src="/icon-192.png"
              alt=""
              width="48"
              height="48"
              className="rounded-xl"
              loading="lazy"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base text-[#2C302B] leading-tight">
              Keep Mamascript on your home screen
            </h3>
            {mode === "ios" ? (
              <p className="mt-1 text-sm text-[#615a4f] leading-relaxed">
                Tap{" "}
                <Share className="inline-block align-text-bottom" size={16} strokeWidth={2.2} />{" "}
                in Safari, then{" "}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F6EFE3] text-[#7a5538] text-xs font-semibold">
                  <Plus size={12} strokeWidth={2.8} /> Add to Home Screen
                </span>{" "}
                — it opens like a real app, even when you're offline.
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#615a4f] leading-relaxed">
                One tap and Mamascript lives on your phone like a native app — record voices, browse vaults, no browser tab to lose.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            data-testid="install-prompt-close"
            aria-label="Dismiss"
            className="shrink-0 p-1.5 rounded-full text-[#8a8275] hover:bg-[#F1ECDF] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {mode === "native" && (
          <div className="border-t border-[#EBE3D2] px-4 py-3 flex items-center justify-end gap-2 bg-[#FAF5EB]">
            <button
              type="button"
              onClick={dismiss}
              data-testid="install-prompt-later"
              className="px-3 py-2 text-sm text-[#7a7264] font-semibold rounded-lg hover:bg-[#F1ECDF] transition-colors"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={install}
              data-testid="install-prompt-install"
              className="px-4 py-2 text-sm rounded-lg bg-[#D96C4A] text-[#FDFBF7] font-semibold inline-flex items-center gap-2 shadow-sm btn-press hover:bg-[#C45D3D] transition-colors"
            >
              <Download size={16} strokeWidth={2.4} />
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
