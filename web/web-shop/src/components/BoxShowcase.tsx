import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Box, Camera, DoorClosed, DoorOpen, Pause, Play, RotateCcw } from 'lucide-react';
import { BoxModel, type BoxFocus } from '../pages/landing/BoxModel';
import { PARTS, type Part } from '../pages/landing/BoxExplorer';
import { prefersReducedMotion } from '../pages/landing/useScrollProgress';
import '../pages/landing/landing.css';
import './box-showcase.css';

interface Pose { rot: number; tilt: number; door: number }

interface Shot {
  key: string;
  label: string;
  pose: Pose;
  lcd: [string, string];
  unlocked?: boolean;
  parcel?: boolean;
  zoom?: number;
  focus?: BoxFocus;
}

const SHOTS: Shot[] = [
  { key: 'angle', label: 'Góc nghiêng', pose: { rot: -32, tilt: -12, door: 0 }, lcd: ['ANCHOR BOX', 'NHAP MA PIN'] },
  { key: 'front', label: 'Mặt trước', pose: { rot: 0, tilt: -4, door: 0 }, lcd: ['ANCHOR BOX', 'NHAP MA PIN'] },
  { key: 'open', label: 'Khoang chứa', pose: { rot: -16, tilt: -14, door: -112 }, lcd: ['DA NHAN HANG', '1.25 kg'], unlocked: true, parcel: true },
  { key: 'side', label: 'Cạnh bên', pose: { rot: -72, tilt: -8, door: 0 }, lcd: ['ANCHOR BOX', 'SAN SANG'] },
  { key: 'panel', label: 'Bàn phím & LCD', pose: { rot: -4, tilt: -4, door: 0 }, lcd: ['NHAP MA PIN', '******'], zoom: 2.1, focus: 'keypad' },
];

const OVERVIEW: Pose = { rot: -32, tilt: -12, door: 0 };

const SIZES: Record<number, { w: number; h: number; d: number }> = {
  45: { w: 230, h: 300, d: 190 },
  75: { w: 250, h: 340, d: 210 },
  110: { w: 275, h: 380, d: 230 },
};

function boxSize(capacity?: number | null) {
  if (!capacity) return SIZES[75];
  const nearest = Object.keys(SIZES).map(Number).reduce((best, c) => (Math.abs(c - capacity) < Math.abs(best - capacity) ? c : best), 75);
  return SIZES[nearest];
}

/** Paint the CSS box in the selected finish: metal tones are derived from the variant colour. */
function finishStyle(colorHex?: string | null): CSSProperties & Record<string, string> {
  if (!colorHex || !/^#[0-9a-f]{6}$/i.test(colorHex)) return {};
  const r = parseInt(colorHex.slice(1, 3), 16), g = parseInt(colorHex.slice(3, 5), 16), b = parseInt(colorHex.slice(5, 7), 16);
  const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
  return {
    '--ab-metal-1': `color-mix(in srgb, ${colorHex} 82%, #ffffff)`,
    '--ab-metal-2': colorHex,
    '--ab-metal-3': `color-mix(in srgb, ${colorHex} ${light ? 82 : 70}%, #000000)`,
    '--pdp-brand-ink': light ? 'rgba(28, 28, 30, 0.45)' : 'rgba(255, 255, 255, 0.55)',
  };
}

function stageVars(pose: Pose, capacity?: number | null, parcel = false): Record<string, string | number> {
  const size = boxSize(capacity);
  return {
    '--rot': `${pose.rot}deg`,
    '--tilt': `${pose.tilt}deg`,
    '--door': `${pose.door}deg`,
    '--drop': '0px',
    '--drop-o': parcel ? 1 : 0,
    '--w': `${size.w}px`,
    '--h': `${size.h}px`,
    '--d': `${size.d}px`,
  };
}

function ShotStage({ shot, capacity, mini = false }: { shot: Shot; capacity?: number | null; mini?: boolean }) {
  return (
    <div
      className={`ab-stage pdp-stage ${mini ? 'is-mini' : ''}`}
      style={{ ...stageVars(shot.pose, capacity, shot.parcel), '--zoom': shot.zoom ?? 1 } as CSSProperties}
      aria-hidden="true"
    >
      <div className="ab-floor-shadow" />
      <div className="pdp-zoom">
        <BoxModel lcd={shot.lcd} unlocked={!!shot.unlocked} focus={mini ? null : shot.focus ?? null} />
      </div>
    </div>
  );
}

/** Static mini render of the box in a given finish, for cart lines and cards. */
export function BoxThumb({ colorHex, capacity, className = '' }: { colorHex?: string | null; capacity?: number | null; className?: string }) {
  return (
    <div className={`ab-landing pdp-showcase pdp-boxthumb ${className}`} style={finishStyle(colorHex)} aria-hidden="true">
      <ShotStage shot={SHOTS[0]} capacity={capacity} mini />
    </div>
  );
}

export interface BoxShowcaseProps {
  productName: string;
  colorHex?: string | null;
  colorName?: string | null;
  capacity?: number | null;
}

export function BoxShowcase({ productName, colorHex, colorName, capacity }: BoxShowcaseProps) {
  const [mode, setMode] = useState<'studio' | '3d'>('studio');
  const [shotKey, setShotKey] = useState(SHOTS[0].key);
  const shot = SHOTS.find(s => s.key === shotKey) ?? SHOTS[0];
  const finish = finishStyle(colorHex);
  const caption = [productName, capacity ? `${capacity} L` : null, colorName].filter(Boolean).join(' · ');

  return (
    <div className="ab-landing pdp-showcase" style={finish}>
      <div className="pdp-mode-switch" role="tablist" aria-label="Chế độ xem sản phẩm">
        <button type="button" role="tab" aria-selected={mode === 'studio'} className={mode === 'studio' ? 'is-active' : ''} onClick={() => setMode('studio')}>
          <Camera size={15} aria-hidden /> Ảnh studio
        </button>
        <button type="button" role="tab" aria-selected={mode === '3d'} className={mode === '3d' ? 'is-active' : ''} onClick={() => setMode('3d')}>
          <Box size={15} aria-hidden /> Trình diễn 3D
        </button>
      </div>

      {mode === 'studio' ? (
        <>
          <figure className="pdp-studio" aria-label={`${caption}, ${shot.label}`}>
            <ShotStage key={shot.key} shot={shot} capacity={capacity} />
            <figcaption>
              <strong>{shot.label}</strong>
              <span>{caption}</span>
            </figcaption>
          </figure>
          <div className="pdp-thumbs" role="tablist" aria-label="Góc chụp">
            {SHOTS.map(item => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={item.key === shot.key}
                aria-label={item.label}
                title={item.label}
                className={`pdp-thumb ${item.key === shot.key ? 'is-active' : ''}`}
                onClick={() => setShotKey(item.key)}
              >
                <ShotStage shot={item} capacity={capacity} mini />
              </button>
            ))}
          </div>
        </>
      ) : (
        <Interactive capacity={capacity} />
      )}
    </div>
  );
}

function Interactive({ capacity }: { capacity?: number | null }) {
  const [part, setPart] = useState<Part | null>(null);
  const [pose, setPose] = useState<Pose>(OVERVIEW);
  const [doorOpen, setDoorOpen] = useState(false);
  const [spinning, setSpinning] = useState(() => !prefersReducedMotion());
  const drag = useRef<{ x: number; y: number; pose: Pose } | null>(null);

  useEffect(() => {
    if (!spinning) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setPose(p => ({ ...p, rot: ((p.rot - delta * 0.02 + 180) % 360) - 180 }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  const choose = (next: Part | null) => {
    setSpinning(false);
    setPart(next);
    setPose(next?.pose ?? OVERVIEW);
    setDoorOpen((next?.pose.door ?? 0) !== 0);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setSpinning(false);
    drag.current = { x: event.clientX, y: event.clientY, pose };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    setPose({
      rot: start.pose.rot + (event.clientX - start.x) * 0.45,
      tilt: Math.max(-35, Math.min(8, start.pose.tilt - (event.clientY - start.y) * 0.25)),
      door: start.pose.door,
    });
  };
  const endDrag = () => { drag.current = null; };

  const door = doorOpen ? (part?.pose.door && part.pose.door !== 0 ? part.pose.door : -105) : 0;
  const lcd: [string, string] = part?.lcd ?? (doorOpen ? ['MA HOP LE', 'MOI MO CUA'] : ['ANCHOR BOX', 'NHAP MA PIN']);
  const unlocked = doorOpen || !!part?.unlocked;

  return (
    <div className="pdp-interactive">
      <div
        className="ab-stage pdp-stage pdp-stage-3d"
        style={stageVars({ ...pose, door }, capacity, !!part?.parcel) as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="img"
        aria-label="Mô hình 3D Anchor Box, kéo để xoay"
      >
        <div className="ab-floor-shadow" />
        <div className="pdp-zoom">
          <BoxModel lcd={lcd} unlocked={unlocked} focus={part?.key ?? null} />
        </div>
        <span className="pdp-drag-hint">Kéo để xoay</span>
      </div>

      <div className="pdp-controls">
        <button type="button" onClick={() => setDoorOpen(v => !v)} aria-pressed={doorOpen}>
          {doorOpen ? <DoorClosed size={15} aria-hidden /> : <DoorOpen size={15} aria-hidden />}
          {doorOpen ? 'Đóng cửa' : 'Mở cửa'}
        </button>
        <button type="button" onClick={() => setSpinning(v => !v)} aria-pressed={spinning}>
          {spinning ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
          {spinning ? 'Dừng xoay' : 'Tự xoay'}
        </button>
        <button type="button" onClick={() => choose(null)}>
          <RotateCcw size={15} aria-hidden /> Đặt lại
        </button>
      </div>

      <div className="pdp-parts" role="group" aria-label="Bộ phận">
        {PARTS.map(item => (
          <button
            key={item.key}
            type="button"
            aria-pressed={part?.key === item.key}
            className={part?.key === item.key ? 'is-active' : ''}
            onClick={() => choose(part?.key === item.key ? null : item)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {part && (
        <div className="pdp-part-card" role="status">
          <strong>{part.title}</strong>
          <p>{part.body}</p>
        </div>
      )}
    </div>
  );
}
