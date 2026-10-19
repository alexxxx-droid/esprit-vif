import { locale } from '../../core/lang';
import { platform } from '../platform';

/**
 * Reconnaissance vocale (Web Speech API), utilisée en option par Couleurs piégées.
 * Selon le navigateur, l'audio peut être traité par un service en ligne : l'option est donc désactivée par défaut.
 */
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dans l'appli Android, la WebView annonce la reconnaissance vocale sans la fournir réellement
 * (et l'APK ne demande pas le micro) : l'option n'y est donc pas proposée.
 */
export function voiceSupported(): boolean {
  return !platform().native && recognitionCtor() !== null;
}

export interface VoiceSession {
  stop(): void;
}

/**
 * Écoute en continu et transmet chaque bout de phrase reconnu, même provisoire.
 * `key` identifie la phrase en cours : ses versions successives partagent la même clé,
 * ce qui permet de ne répondre qu'une fois par phrase prononcée.
 * `onUnavailable` est appelé si le micro est refusé ou indisponible.
 */
export function listen(onTranscript: (text: string, key: string) => void, onUnavailable: () => void): VoiceSession {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    onUnavailable();
    return { stop() {} };
  }
  let active = true;
  let round = 0;
  const recognition = new Ctor();
  recognition.lang = locale();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const index = event.results.length - 1;
    const result = event.results[index];
    if (result?.[0]) onTranscript(result[0].transcript, `${round}:${index}`);
  };
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
      active = false;
      onUnavailable();
    }
  };
  // Certains navigateurs coupent l'écoute au bout de quelques secondes : on la relance.
  recognition.onend = () => {
    if (active) {
      round += 1;
      try {
        recognition.start();
      } catch {
        active = false;
      }
    }
  };
  try {
    recognition.start();
  } catch {
    onUnavailable();
  }
  return {
    stop() {
      active = false;
      recognition.onend = null;
      recognition.abort();
    },
  };
}
