const KEYS = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];

export type BoxFocus = 'keypad' | 'lock' | 'scale' | 'door' | 'status' | null;

interface BoxModelProps {
  lcd: [string, string];
  unlocked: boolean;
  /** Part to highlight (product viewer). */
  focus?: BoxFocus;
}

/**
 * CSS 3D model of the Anchor Box Base. Pose and door angle come from CSS variables set on an
 * ancestor (--rot, --tilt, --door, --drop, --drop-o), so scroll scenes and the viewer can drive it.
 */
export function BoxModel({ lcd, unlocked, focus = null }: BoxModelProps) {
  return (
    <div className="ab-box3d" data-focus={focus ?? undefined}>
      <div className="ab-sway">
        <div className="ab-face ab-face-back" />
        <div className="ab-face ab-face-left" />
        <div className="ab-face ab-face-right" />
        <div className="ab-face ab-face-top" />
        <div className="ab-face ab-face-bottom" />

        <div className="ab-face ab-face-front">
          <div className="ab-panel">
            <div className="ab-lcd">
              <span>{lcd[0]}</span>
              <span>{lcd[1]}</span>
            </div>
            <div className="ab-panel-row">
              <div className="ab-keypad">
                {KEYS.map((key) => <span key={key}>{key}</span>)}
              </div>
              <div className="ab-leds">
                <i className={`ab-led ab-led-red ${!unlocked ? 'is-on' : ''}`} />
                <i className="ab-led ab-led-yellow is-on" />
                <i className={`ab-led ab-led-green ${unlocked ? 'is-on' : ''}`} />
              </div>
            </div>
          </div>
          <div className="ab-cavity">
            <div className="ab-parcel"><span /></div>
            <div className="ab-scale-plate" />
            <span className="ab-latch" />
            <span className="ab-reed" />
          </div>
        </div>
        <div className="ab-door">
          <div className="ab-door-outer">
            <span className="ab-door-handle" />
            <span className="ab-door-brand">Anchor Box</span>
          </div>
          <div className="ab-door-inner" />
        </div>
      </div>
    </div>
  );
}
