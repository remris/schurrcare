"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Kostenlose Spracheingabe über die im Browser eingebaute Web Speech API
// (Chrome/Android, Safari/iOS, Edge). Firefox unterstützt sie nicht -> Mikrofon-Knopf wird ausgeblendet.
export function useSpeech(onResult: (text: string) => void, lang = "de-DE") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) cb.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => rec.abort?.();
  }, [lang]);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {
        /* läuft schon */
      }
    }
  }, [listening]);

  return { supported, listening, toggle };
}

/** "Brot, Milch und zwei Butter" -> ["Brot", "Milch", "zwei Butter"] */
export function splitItems(text: string) {
  return text
    .replace(/\s+(und|sowie|außerdem|plus)\s+/gi, ",")
    .split(/[,;\n]+/)
    .map((s) => s.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean);
}
