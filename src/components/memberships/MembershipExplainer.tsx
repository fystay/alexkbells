"use client";

import { useState } from "react";

/**
 * How memberships work, as five looping scenes. The captions are the five terms
 * in content/policy.ts, passed in so the animation can never disagree with the
 * written terms. The scenes show no figures of their own, apart from the word
 * "£12" which is taken from the terms. Motion runs only when the visitor has
 * not asked for reduced motion (globals.css), and without it the scenes change only when chosen; the progress bar doubles as a
 * scene picker and the pause button stops the auto-advance.
 */
export function MembershipExplainer({ terms, extraClassPrice }: { terms: readonly string[]; extraClassPrice: string }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = (i: number) => setCurrent((i + 1) % terms.length);

  return (
    <div className="mx mx-split lg:grid lg:grid-cols-[32.5rem_1fr] lg:items-center lg:gap-x-16" data-paused={paused || undefined}>
      <div>
        {/* Decorative: the five terms are in the list that follows. */}
        <div className="mx-stage" aria-hidden="true">
          {/* key restarts the scene's animations each time it is shown */}
          <svg key={current} viewBox="0 0 400 344" className="mx-scene">
            {current === 0 && <SceneCredit />}
            {current === 1 && <SceneRenewal />}
            {current === 2 && <SceneExpiry />}
            {current === 3 && <SceneExtra price={extraClassPrice} />}
            {current === 4 && <ScenePolicy />}
          </svg>
        </div>

        <p className="mx-caption" aria-hidden="true">
          <span className="font-semibold tabular-nums">
            {current + 1} / {terms.length}
          </span>
          <span key={current} className="mx-swap">
            {terms[current]}
          </span>
        </p>

        <div className="mt-6 flex max-w-[32.5rem] items-center gap-4">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Play animation" : "Pause animation"}
            className="grid size-11 shrink-0 place-items-center border-[1.5px] border-ink bg-paper text-ink hover:bg-ink hover:text-paper"
          >
            <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
              <path d={paused ? "M4 2l10 6-10 6z" : "M3 2h4v12H3zM9 2h4v12H9z"} />
            </svg>
          </button>
          <div className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
            {terms.map((term, i) => (
              <button
                key={term}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Show step ${i + 1} of ${terms.length}`}
                aria-current={i === current ? "step" : undefined}
                className="mx-seg"
              >
                <span className="mx-track">
                  <i
                    key={i === current ? `cur-${current}` : "idle"}
                    className={i < current ? "mx-fill mx-done" : i === current ? "mx-fill mx-cur" : "mx-fill"}
                    onAnimationEnd={() => {
                      if (!paused && i === current) next(i);
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* From lg the five terms sit beside the picture, the current one in bold (the picture and bar above change it).
          Decorative: the same five terms are the accessible list in MembershipTerms. */}
      <ul aria-hidden="true" className="bullets hidden text-lede lg:block">
        {terms.map((term, i) => (
          <li key={term} className={i === current ? "font-semibold" : undefined}>
            {term}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Label({ x, y, anchor, muted, children, style }: { x: number; y: number; anchor?: "middle"; muted?: boolean; children: string; style?: React.CSSProperties }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`mx-lbl${muted ? " mx-muted" : ""}${style ? " mx-a mx-fade" : ""}`} style={style}>
      {children}
    </text>
  );
}

/** Scene 1: one credit moves between the three class days. */
function SceneCredit() {
  return (
    <>
      <Label x={200} y={52} anchor="middle" muted>
        One class credit
      </Label>
      <line className="mx-hair" x1={40} y1={190} x2={360} y2={190} />
      {[
        { x: 40, day: "Mon", cls: "mx-t1" },
        { x: 150, day: "Wed", cls: "mx-t2" },
        { x: 260, day: "Sat", cls: "mx-t3" },
      ].map((t) => (
        <g key={t.day}>
          <rect className={`mx-ol mx-box ${t.cls}`} x={t.x} y={142} width={100} height={96} />
          <Label x={t.x + 50} y={196} anchor="middle">
            {t.day}
          </Label>
        </g>
      ))}
      <g className="mx-hop">
        <circle className="mx-fl" cx={200} cy={96} r={16} />
        <circle className="mx-pp" cx={200} cy={96} r={5} />
      </g>
      <Label x={200} y={290} anchor="middle" muted>
        Any available class
      </Label>
    </>
  );
}

/** Scene 2: four weeks, then the loop back to the start with new credits. */
function SceneRenewal() {
  const weeks = [40, 122, 204, 286];
  return (
    <>
      <Label x={40} y={62} muted>
        Membership period
      </Label>
      {weeks.map((x, i) => (
        <g key={x}>
          <rect className="mx-fl mx-a mx-wipe" style={{ "--d": `${0.2 + i * 0.35}s` } as React.CSSProperties} x={x} y={104} width={74} height={40} />
          <rect className="mx-ol" x={x} y={104} width={74} height={40} />
          <Label x={x + 37} y={168} anchor="middle" muted>
            {`Wk ${i + 1}`}
          </Label>
        </g>
      ))}
      <path className="mx-ol mx-a mx-draw" style={{ "--len": 420, "--d": "2.1s", "--t": "1s" } as React.CSSProperties} d="M323 190 V228 H77 V206" />
      <path className="mx-fl mx-a mx-fade" style={{ "--d": "3s" } as React.CSSProperties} d="M70 208 L77 196 L84 208 Z" />
      <Label x={200} y={252} anchor="middle" style={{ "--d": "2.6s" } as React.CSSProperties}>
        Renews automatically
      </Label>
      {[190, 226, 262, 298].map((cx, i) => (
        <g key={cx} className="mx-a mx-pop" style={{ "--d": `${3.2 + i * 0.15}s` } as React.CSSProperties}>
          <circle className="mx-ol" cx={cx} cy={300} r={11} />
          <circle className="mx-fl" cx={cx} cy={300} r={5} />
        </g>
      ))}
      <Label x={40} y={304} muted style={{ "--d": "3.2s" } as React.CSSProperties}>
        New credits
      </Label>
    </>
  );
}

/** Scene 3: unused credits drift away at the end of the period. */
function SceneExpiry() {
  return (
    <>
      <Label x={40} y={62} muted>
        End of period
      </Label>
      <rect className="mx-ol" x={40} y={92} width={190} height={88} />
      <circle className="mx-fl" cx={78} cy={136} r={13} />
      {[122, 166, 210].map((cx, i) => (
        <circle key={cx} className="mx-fl mx-a mx-gone" style={{ "--d": `${1.2 + i * 0.25}s` } as React.CSSProperties} cx={cx} cy={136} r={13} />
      ))}
      <rect className="mx-ol mx-dash" x={270} y={92} width={90} height={88} />
      <Label x={315} y={141} anchor="middle" muted>
        Next
      </Label>
      <line className="mx-hair mx-dash" x1={236} y1={136} x2={264} y2={136} />
      <path className="mx-ol mx-a mx-cross" style={{ "--len": 30, "--d": "2.6s" } as React.CSSProperties} d="M240 124 L260 148" />
      <path className="mx-ol mx-a mx-cross" style={{ "--len": 30, "--d": "3s" } as React.CSSProperties} d="M260 124 L240 148" />
      <text className="mx-big mx-a mx-rise" style={{ "--d": "2.9s" } as React.CSSProperties} x={40} y={276}>
        No roll over
      </text>
      <Label x={40} y={306} muted>
        Unused credits expire
      </Label>
    </>
  );
}

/** Scene 4: out of credits, so one more class at the pay-as-you-go price. */
function SceneExtra({ price }: { price: string }) {
  return (
    <>
      <Label x={40} y={62} muted>
        Out of credits?
      </Label>
      {[70, 114, 158].map((cx) => (
        <g key={cx}>
          <circle className="mx-ol" cx={cx} cy={128} r={14} />
          <circle className="mx-fl" cx={cx} cy={128} r={6} />
        </g>
      ))}
      <circle className="mx-ol mx-dash mx-a mx-pop" style={{ "--d": "0.9s" } as React.CSSProperties} cx={214} cy={128} r={14} />
      <circle className="mx-fl mx-a mx-pop" style={{ "--d": "1.9s" } as React.CSSProperties} cx={214} cy={128} r={14} />
      <path className="mx-tick mx-a mx-fade" style={{ "--d": "2.1s" } as React.CSSProperties} d="M207 128 l5 5 l9 -10" />
      <text className="mx-big mx-a mx-rise" style={{ "--d": "1.3s" } as React.CSSProperties} x={40} y={250}>
        {price}
      </text>
      <Label x={40} y={282} muted style={{ "--d": "1.6s" } as React.CSSProperties}>
        Per additional class
      </Label>
      <line className="mx-hair" x1={40} y1={298} x2={360} y2={298} />
      <Label x={40} y={322} style={{ "--d": "2.6s" } as React.CSSProperties}>
        Subject to availability
      </Label>
    </>
  );
}

/** Scene 5: every booking leads to the cancellation policy. */
function ScenePolicy() {
  return (
    <>
      <Label x={40} y={62} muted>
        Every booking and cancellation
      </Label>
      <g className="mx-a mx-rise" style={{ "--d": "0.2s" } as React.CSSProperties}>
        <rect className="mx-ol" x={40} y={104} width={130} height={120} />
        <rect className="mx-fl" x={40} y={104} width={130} height={30} />
        <text x={105} y={124} textAnchor="middle" className="mx-lbl mx-inv">
          Class
        </text>
        <path className="mx-ol mx-a mx-draw mx-heavy" style={{ "--len": 60, "--d": "0.9s" } as React.CSSProperties} d="M82 180 l16 16 l30 -34" />
      </g>
      <line className="mx-ol mx-a mx-draw" style={{ "--len": 60, "--d": "1.5s" } as React.CSSProperties} x1={176} y1={164} x2={224} y2={164} />
      <g className="mx-a mx-rise" style={{ "--d": "1.7s" } as React.CSSProperties}>
        <rect className="mx-ol" x={230} y={104} width={130} height={120} />
        <line className="mx-ol" x1={250} y1={132} x2={340} y2={132} />
        <line className="mx-hair" x1={250} y1={156} x2={340} y2={156} />
        <line className="mx-hair" x1={250} y1={176} x2={340} y2={176} />
        <line className="mx-hair" x1={250} y1={196} x2={310} y2={196} />
      </g>
      <Label x={105} y={256} anchor="middle" muted>
        Booked
      </Label>
      <Label x={295} y={256} anchor="middle" muted>
        Cancellation policy
      </Label>
      <text className="mx-big mx-a mx-fade" style={{ "--d": "2.4s", fontSize: 30 } as React.CSSProperties} x={40} y={314}>
        Always applies.
      </text>
    </>
  );
}
