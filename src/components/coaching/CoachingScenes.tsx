import type { CSSProperties, ReactNode } from "react";

/**
 * The drawings for the 1:1 coaching explainers (components/ui/Explainer.tsx).
 * Plain SVG on a 400 x 344 stage in the site's four colours, animated by the `.mx-*`
 * classes in globals.css. They are abstract on purpose: the only words are short
 * labels taken from the pages' own copy, and nothing shows a number, a duration
 * or a result that the page doesn't state.
 */

const d = (delay: number): CSSProperties => ({ "--d": `${delay}s` }) as CSSProperties;
const len = (n: number, delay: number): CSSProperties => ({ "--len": n, "--d": `${delay}s` }) as CSSProperties;

function Label({ x, y, anchor, muted, delay, children }: { x: number; y: number; anchor?: "middle"; muted?: boolean; delay?: number; children: string }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`mx-lbl${muted ? " mx-muted" : ""}${delay !== undefined ? " mx-a mx-fade" : ""}`} style={delay !== undefined ? d(delay) : undefined}>
      {children}
    </text>
  );
}

/** A person: head, shoulders and a stance. */
function Person({ x, delay }: { x: number; delay: number }) {
  return (
    <g className="mx-a mx-rise" style={d(delay)}>
      <circle className="mx-fl" cx={x} cy={140} r={16} />
      <path className="mx-ol" strokeWidth={3} d={`M${x} 164 V232 M${x - 30} 186 H${x + 30} M${x} 232 L${x - 20} 276 M${x} 232 L${x + 20} 276`} />
    </g>
  );
}

/* ---------- 1:1 coaching: how it works ---------- */

const sceneRequest = (
  <>
    <Label x={40} y={62} muted>
      Your request
    </Label>
    <g className="mx-a mx-pop" style={d(0.1)}>
      <path className="mx-ol" d="M40 100 H340 V232 H110 L72 268 V232 H40 Z" />
    </g>
    <path className="mx-ol mx-a mx-draw" style={len(260, 0.6)} d="M64 134 H300" />
    <path className="mx-ol mx-a mx-draw" style={len(260, 0.9)} d="M64 164 H316" />
    <path className="mx-ol mx-a mx-draw" style={len(260, 1.2)} d="M64 194 H220" />
    <Label x={40} y={310} muted delay={1.8}>
      Days and times that suit you
    </Label>
  </>
);

const sceneConfirm = (
  <>
    <Label x={40} y={62} muted>
      Alex confirms
    </Label>
    {Array.from({ length: 21 }, (_, i) => {
      const col = i % 7;
      const row = Math.floor(i / 7);
      if (col === 3 && row === 1) return null;
      return <rect key={i} className="mx-ol" x={42 + col * 46} y={100 + row * 46} width={40} height={40} />;
    })}
    <g className="mx-a mx-pop" style={d(0.9)}>
      <rect className="mx-fl" x={42 + 3 * 46} y={100 + 46} width={40} height={40} />
    </g>
    <path className="mx-tick mx-a mx-fade" style={d(1.5)} d={`M${42 + 3 * 46 + 11} ${100 + 46 + 21} l7 7 l13 -14`} />
    <Label x={40} y={310} muted delay={1.9}>
      Your session
    </Label>
  </>
);

const sceneFaceToFace = (
  <>
    <Label x={40} y={62} muted>
      Face to face
    </Label>
    <Person x={120} delay={0.2} />
    <Person x={280} delay={0.6} />
    <g className="mx-a mx-pop" style={d(1.2)}>
      <path className="mx-ol" strokeWidth={3} d="M184 268 C184 232 216 232 216 268" />
      <circle className="mx-fl" cx={200} cy={286} r={24} />
    </g>
    <path className="mx-hair mx-dash mx-a mx-draw" style={len(120, 1.8)} d="M140 140 H260" />
    <Label x={40} y={332} muted delay={2}>
      Built around you
    </Label>
  </>
);

/* ---------- 1:1 coaching: what you get (tap to explore) ---------- */

const sceneStrength = (
  <>
    <Label x={40} y={62} muted>
      Built progressively
    </Label>
    <line className="mx-hair" x1={40} y1={262} x2={360} y2={262} />
    {[60, 150, 240].map((x, i) => (
      <rect key={x} className="mx-fl mx-a mx-rise" style={d(0.2 + i * 0.35)} x={x} y={262 - (60 + i * 50)} width={60} height={60 + i * 50} />
    ))}
    <Label x={40} y={306} muted delay={1.4}>
      Loads that suit you today
    </Label>
  </>
);

const sceneTechnique = (
  <>
    <Label x={40} y={62} muted>
      Feedback on every rep
    </Label>
    <path className="mx-ol mx-a mx-draw" style={len(420, 0.2)} d="M60 250 C100 90 300 90 340 250" />
    <g className="mx-a mx-pop" style={d(1.3)}>
      <circle className="mx-fl" cx={200} cy={118} r={20} />
    </g>
    <path className="mx-tick mx-a mx-fade" style={d(1.7)} d="M191 118 l7 7 l12 -13" />
    <Label x={40} y={306} muted delay={1.9}>
      Use it straight away
    </Label>
  </>
);

const sceneMovement = (
  <>
    <Label x={40} y={62} muted>
      Move well first
    </Label>
    <path className="mx-hair mx-dash" d="M40 140 l32 -34 l32 34 l32 -34 l32 34 l32 -34 l32 34 l32 -34 l32 34" />
    <path className="mx-ol mx-a mx-draw" style={len(420, 0.8)} d="M40 240 C100 190 140 290 200 240 S300 190 360 240" />
    <Label x={40} y={306} muted delay={1.8}>
      Better movement
    </Label>
  </>
);

export const oneToOneHowScenes: ReactNode[] = [sceneRequest, sceneConfirm, sceneFaceToFace];
export const oneToOneFocusScenes: ReactNode[] = [sceneStrength, sceneTechnique, sceneMovement];
