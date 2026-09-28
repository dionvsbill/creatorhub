"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const SOUND_KEY = "creatorhub_last_notification_sound";

export default function RealtimeWorkspace() {
  const lastNotification = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const s = supabase();

    const playNotificationSound = () => {
      try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor) return;
        const ctx = new AudioContextCtor();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
        setTimeout(() => ctx.close().catch(() => {}), 500);
      } catch {}
    };

    const channel = s
      .channel("creatorhub-live-workspace")
      .on("postgres_changes", { event: "*", schema: "public", table: "*" }, (payload) => {
        if (!mounted) return;
        window.dispatchEvent(new CustomEvent("creatorhub:db-change", { detail: payload }));

        if (payload.table === "notifications" && payload.eventType === "INSERT") {
          const id = String((payload.new as any)?.id || "");
          const stored = window.sessionStorage.getItem(SOUND_KEY);
          if (id && id !== stored && id !== lastNotification.current) {
            lastNotification.current = id;
            window.sessionStorage.setItem(SOUND_KEY, id);
            playNotificationSound();
          }
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      s.removeChannel(channel);
    };
  }, []);

  return null;
}
