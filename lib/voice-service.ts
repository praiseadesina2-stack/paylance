// ─── Paylance Voice & Accessibility Engine (WCAG 2.2 AA) ─────────────────────
// Implements browser Speech-to-Text (STT), Speech Synthesis (TTS),
// nonvisual audio cues (Earcons), and screen reader live region announcements.

export interface VoiceState {
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  lastError: string | null;
}

// Audio earcons using Web Audio API for non-visual audio feedback
export function playEarcon(type: "START_LISTEN" | "STOP_LISTEN" | "SUCCESS" | "CONFIRM" | "ALERT") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === "START_LISTEN") {
      // Ascending tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "SUCCESS" || type === "CONFIRM") {
      // Pleasant double chord
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + 0.45);
      });
    } else if (type === "STOP_LISTEN") {
      // Gentle descending tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "ALERT") {
      // Low double beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.debug("Web Audio Earcon not supported or restricted", e);
  }
}

// Text-to-Speech (TTS)
export function speakText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech Synthesis not supported in this browser.");
    options?.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel(); // Stop any pending utterance

  // Clean markdown syntax for clean spoken words
  const cleanText = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/₦/g, " Naira ")
    .replace(/\$/g, " Dollars ")
    .replace(/#/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .trim();

  if (!cleanText) {
    options?.onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;

  // Prefer a natural English voice if present
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
  ) || voices.find((v) => v.lang.startsWith("en"));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.warn("TTS Error:", e);
    options?.onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// Speech-to-Text (STT) Recognition
export class VoiceRecognitionService {
  private recognition: any = null;
  public isSupported: boolean = false;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.isSupported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";
      }
    }
  }

  public start(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): boolean {
    if (!this.isSupported || !this.recognition) {
      onError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return false;
    }

    if (this.isListening) {
      this.stop();
    }

    playEarcon("START_LISTEN");

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interim = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript, true);
      } else if (interim) {
        onResult(interim, false);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      playEarcon("ALERT");
      onError(event.error || "Speech recognition error.");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      playEarcon("STOP_LISTEN");
      onEnd();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      onError(e.message || "Failed to start recognition.");
      return false;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

// Screen reader live region updater
export function announceToScreenReader(message: string, assertive = false) {
  if (typeof document === "undefined") return;
  let region = document.getElementById("paylance-live-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "paylance-live-region";
    region.setAttribute("role", assertive ? "alert" : "status");
    region.setAttribute("aria-live", assertive ? "assertive" : "polite");
    region.setAttribute("aria-atomic", "true");
    region.style.position = "absolute";
    region.style.width = "1px";
    region.style.height = "1px";
    region.style.margin = "-1px";
    region.style.padding = "0";
    region.style.overflow = "hidden";
    region.style.clip = "rect(0, 0, 0, 0)";
    region.style.border = "0";
    document.body.appendChild(region);
  }
  region.textContent = message;
}

