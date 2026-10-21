import qrcode from 'qrcode-generator';
import { useEffect, useRef, useState } from 'react';
import { isCharacterId } from '../../core/characters';
import { plural } from '../../core/format';
import { tr } from '../../core/lang';
import { decodeTransfer, encodeTransfer, FrameCollector, splitCode, transferId, type TransferPayload } from '../../core/transfer';
import { MAX_PROFILES, profileName } from '../../store/profiles';
import { Icon } from '../components/Icon';
import { copyText } from '../platform';
import { useProfileManager, useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

/** Une image toutes les 300 ms : assez lent pour l'appareil photo, assez rapide pour ne pas attendre. */
const FRAME_MS = 300;

/** Le QR code d'une image, en noir sur blanc quel que soit le thème (les lecteurs l'exigent). */
function QrCanvas({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const qr = qrcode(0, 'L');
    qr.addData(text, 'Alphanumeric');
    qr.make();
    const modules = qr.getModuleCount();
    const quiet = 4;
    const cell = Math.max(2, Math.floor(canvas.width / (modules + quiet * 2)));
    const offset = Math.floor((canvas.width - cell * modules) / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < modules; r++) for (let c = 0; c < modules; c++) if (qr.isDark(r, c)) ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
  }, [text]);
  return <canvas ref={ref} className="transfer__qr" width={720} height={720} aria-label={tr('Code de transfert', 'Transfer code')} />;
}

function useSay() {
  const [message, setMessage] = useState<string | null>(null);
  return [message, setMessage] as const;
}

export function TransferScreen() {
  const [tab, setTab] = useState<'send' | 'receive'>('send');
  return (
    <div className="screen screen-in mode-screen transfer">
      <header className="intro__top">
        <button type="button" className="icon-btn" onClick={() => navigate({ name: 'settings' }, { replace: true })} aria-label={tr('Retour', 'Back')}>
          <Icon name="back" />
        </button>
      </header>
      <div className="intro__head">
        <h1 className="intro__title">{tr('Transférer', 'Transfer')}</h1>
        <p className="intro__rule">
          {tr(
            'D’un téléphone à l’autre, ou du site à l’appli\u00a0: ta progression passe par des QR codes, sans compte ni serveur.',
            'From one phone to another, or from the website to the app: your progress travels by QR code, with no account or server.',
          )}
        </p>
      </div>
      <div className="tabs tabs--two" role="tablist" aria-label={tr('Sens du transfert', 'Transfer direction')}>
        <button type="button" role="tab" aria-selected={tab === 'send'} className="tabs__tab" onClick={() => setTab('send')}>
          {tr('Envoyer', 'Send')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'receive'} className="tabs__tab" onClick={() => setTab('receive')}>
          {tr('Recevoir', 'Receive')}
        </button>
      </div>
      {tab === 'send' ? <SendPanel /> : <ReceivePanel />}
    </div>
  );
}

function SendPanel() {
  const data = useProgress();
  const store = useStore();
  const { active, profiles } = useProfiles();
  const [code, setCode] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [message, say] = useSay();

  // Le code n'est calculé qu'une fois en arrivant : la progression ne change pas pendant l'envoi.
  useEffect(() => {
    let alive = true;
    const payload: TransferPayload = { v: 1, profile: { name: active.name, color: active.color, character: active.character }, backup: store.exportJson() };
    void encodeTransfer(payload).then((full) => {
      if (!alive) return;
      setCode(full);
      setFrames(splitCode(full, transferId()));
    });
    return () => {
      alive = false;
    };
  }, [store, active]);

  useEffect(() => {
    if (frames.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % frames.length), FRAME_MS);
    return () => window.clearInterval(id);
  }, [frames.length]);

  return (
    <div className="tab-panel transfer__panel" role="tabpanel">
      <p className="transfer__what">
        <strong>{profileName(active, profiles)}</strong> · {tr(plural(data.plays.length, 'partie'), plural(data.plays.length, 'game'))} ·{' '}
        {tr(plural(data.tests.filter((t) => t.done).length, 'test'), plural(data.tests.filter((t) => t.done).length, 'test'))}
      </p>
      <div className="transfer__qr-wrap">{frames.length ? <QrCanvas text={frames[index % frames.length]} /> : <span className="transfer__wait">{tr('Préparation…', 'Getting ready…')}</span>}</div>
      {frames.length > 1 && (
        <p className="transfer__count" aria-live="off">
          {tr(
            `Image ${(index % frames.length) + 1} / ${frames.length} · elles défilent en boucle`,
            `Image ${(index % frames.length) + 1} / ${frames.length} · they play on a loop`,
          )}
        </p>
      )}
      <ol className="transfer__steps">
        <li>{tr('Sur l’autre appareil\u00a0: Réglages, Transférer, Recevoir.', 'On the other device: Settings, Transfer, Receive.')}</li>
        <li>{tr('Vise ce code et garde les deux écrans immobiles jusqu’à la fin.', 'Point it at this code and keep both screens still until the end.')}</li>
      </ol>
      <button
        type="button"
        className="btn btn--lg btn--ghost"
        disabled={!code}
        onClick={async () =>
          say(
            (await copyText(code ?? ''))
              ? tr('Code copié\u00a0: colle-le dans l’autre appli, onglet Recevoir.', 'Code copied: paste it into the other app, in the Receive tab.')
              : tr('Copie impossible ici.', 'Can’t copy here.'),
          )
        }
      >
        <Icon name="share" />
        {tr('Copier le code (même téléphone)', 'Copy the code (same phone)')}
      </button>
      {message && (
        <p className="mode-note" role="status">
          <Icon name="check" size={18} />
          {message}
        </p>
      )}
    </div>
  );
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

/** Le détecteur du navigateur s'il lit les QR codes ; sinon, jsQR, chargé seulement à ce moment-là. */
async function makeReader(): Promise<(video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>> {
  const Detector = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): BarcodeDetectorLike; getSupportedFormats(): Promise<string[]> } })
    .BarcodeDetector;
  if (Detector && (await Detector.getSupportedFormats().catch((): string[] => [])).includes('qr_code')) {
    const detector = new Detector({ formats: ['qr_code'] });
    return async (video) => (await detector.detect(video).catch(() => []))[0]?.rawValue ?? null;
  }
  const { default: jsQR } = await import('jsqr');
  return async (video, canvas) => {
    const scale = Math.min(1, 900 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !canvas.width) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

function ReceivePanel() {
  const manager = useProfileManager();
  const { active, profiles } = useProfiles();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [received, setReceived] = useState<TransferPayload | null>(null);
  const [pasted, setPasted] = useState('');
  const [message, say] = useSay();
  const [busy, setBusy] = useState(false);

  // L'appareil photo tourne le temps du scan ; chaque image lue s'ajoute à la collecte.
  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const collector = new FrameCollector();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch {
        say(tr('L’appareil photo n’est pas accessible\u00a0: autorise-le, ou colle le code plus bas.', 'The camera isn’t available: allow it, or paste the code below.'));
        setScanning(false);
        return;
      }
      if (stopped || !videoRef.current) return stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      const read = await makeReader();
      const tick = async () => {
        if (stopped || !videoRef.current || !canvasRef.current) return;
        const text = await read(videoRef.current, canvasRef.current);
        if (text && collector.add(text)) setProgress({ received: collector.received, total: collector.total });
        const full = collector.code();
        if (full) {
          setScanning(false);
          const payload = await decodeTransfer(full);
          if (payload) setReceived(payload);
          else say(tr('Le code reçu est abîmé. Recommence le scan.', 'The code received is damaged. Scan again.'));
          return;
        }
        timer = window.setTimeout(() => void tick(), 90);
      };
      void tick();
    })();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, say]);

  const summary = (() => {
    if (!received) return null;
    try {
      const backup = JSON.parse(received.backup) as { plays?: unknown[]; tests?: { done?: boolean }[] };
      return { plays: backup.plays?.length ?? 0, tests: backup.tests?.filter((t) => t.done).length ?? 0 };
    } catch {
      return { plays: 0, tests: 0 };
    }
  })();

  const apply = async (asNew: boolean) => {
    if (!received) return;
    setBusy(true);
    const { name, color, character } = received.profile;
    const companion = isCharacterId(character) ? character : 'vif';
    try {
      if (asNew) {
        await manager.add(name || tr('Joueur', 'Player'), color, companion);
        await manager.getSnapshot().store.importJson(received.backup);
      } else {
        await manager.getSnapshot().store.importJson(received.backup);
        await manager.update(active.id, { ...(name ? { name } : {}), color, character: companion });
      }
      navigate({ name: 'home' }, { replace: true });
    } catch (error) {
      setBusy(false);
      say(error instanceof Error ? error.message : tr('Transfert impossible.', 'Transfer failed.'));
    }
  };

  if (received && summary) {
    const who = received.profile.name || tr('Ce joueur', 'This player');
    return (
      <div className="tab-panel transfer__panel" role="tabpanel">
        <div className="transfer__done">
          <Icon name="check" size={28} strokeWidth={3} />
          <p>
            {tr('Progression reçue\u00a0: ', 'Progress received: ')}
            <strong>{who}</strong>, {tr(plural(summary.plays, 'partie'), plural(summary.plays, 'game'))}, {tr(plural(summary.tests, 'test'), plural(summary.tests, 'test'))}.
          </p>
        </div>
        <div className="mode-actions">
          {profiles.length < MAX_PROFILES && (
            <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={() => void apply(true)}>
              <Icon name="plus" />
              {tr('Ajouter comme nouveau joueur', 'Add as a new player')}
            </button>
          )}
          <button type="button" className="btn btn--lg btn--ghost danger-text" disabled={busy} onClick={() => void apply(false)}>
            {tr(`Remplacer la progression de ${profileName(active, profiles)}`, `Replace ${profileName(active, profiles)}’s progress`)}
          </button>
          <button type="button" className="btn btn--lg btn--ghost" disabled={busy} onClick={() => setReceived(null)}>
            {tr('Annuler', 'Cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel transfer__panel" role="tabpanel">
      <div className={`transfer__camera${scanning ? ' is-on' : ''}`}>
        <video ref={videoRef} muted playsInline aria-hidden="true" />
        <canvas ref={canvasRef} hidden />
        {!scanning && (
          <button type="button" className="btn btn--primary btn--lg transfer__scan" onClick={() => setScanning(true)}>
            <Icon name="target" />
            {tr('Scanner avec l’appareil photo', 'Scan with the camera')}
          </button>
        )}
        {scanning && <span className="transfer__frame" aria-hidden="true" />}
      </div>
      {scanning && (
        <div className="transfer__progress" role="status">
          <span className="transfer__bar">
            <span style={{ transform: `scaleX(${progress ? progress.received / progress.total : 0})` }} />
          </span>
          {progress
            ? tr(`Reçu ${progress.received} / ${progress.total}`, `Received ${progress.received} / ${progress.total}`)
            : tr('Vise le code de l’autre appareil…', 'Point at the code on the other device…')}
          <button type="button" className="btn btn--ghost" onClick={() => setScanning(false)}>
            {tr('Arrêter', 'Stop')}
          </button>
        </div>
      )}
      <label className="field">
        <span className="field__label">{tr('Ou colle un code copié', 'Or paste a copied code')}</span>
        <textarea className="field__input transfer__paste" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="EV1:…" rows={3} spellCheck={false} />
      </label>
      <button
        type="button"
        className="btn btn--lg"
        disabled={!pasted.trim()}
        onClick={async () => {
          const payload = await decodeTransfer(pasted);
          if (payload) setReceived(payload);
          else say(tr('Ce code est incomplet ou abîmé.', 'This code is incomplete or damaged.'));
        }}
      >
        {tr('Valider le code', 'Use this code')}
      </button>
      {message && (
        <p className="mode-note" role="status">
          <Icon name="info" size={18} />
          {message}
        </p>
      )}
    </div>
  );
}
