import { memo } from 'react'

/**
 * Hand-authored root system.
 * Coordinates live in the reference artboard space (776 x 621) so the strokes
 * grip the same rock every photographic layer is anchored to.
 *
 * Each root is a tapered ribbon generated from a spine; a dash-grown masked
 * "brush" sweeps from the crown to the tip (Experience.jsx animates it).
 */

const ROOTS = [
  // long, deliberate sweeps — the roots feel for the stone rather than radiate
  { pts: [[382, 518], [368, 513], [353, 517], [341, 527], [334, 540], [330, 553]], w0: 13, w1: 2, start: 27.2, dur: 6 },
  { pts: [[395, 518], [409, 514], [422, 518], [432, 528], [438, 541], [440, 554]], w0: 12.5, w1: 2, start: 27.8, dur: 5.8 },
  { pts: [[372, 527], [361, 537], [354, 550], [345, 560], [342, 570]], w0: 7.5, w1: 1.2, start: 29.4, dur: 4.8 },
  { pts: [[402, 527], [413, 537], [419, 550], [426, 560], [428, 570]], w0: 7.5, w1: 1.2, start: 29.8, dur: 4.6 },
  { pts: [[387, 527], [384, 540], [388, 551], [394, 560]], w0: 6, w1: 1, start: 30.6, dur: 4.2 },
]

const ROOTLETS = [
  { pts: [[335, 527], [328, 536], [325, 545], [326, 553]], w0: 3.6, w1: 0.8, start: 32.4, dur: 2.6 },
  { pts: [[437, 532], [444, 541], [447, 550], [446, 558]], w0: 3.6, w1: 0.8, start: 32.6, dur: 2.6 },
  { pts: [[324, 541], [318, 549], [316, 557]], w0: 2.8, w1: 0.7, start: 33.6, dur: 2.4 },
  { pts: [[446, 548], [450, 556], [449, 564]], w0: 2.8, w1: 0.7, start: 33.8, dur: 2.4 },
  { pts: [[385, 539], [379, 548], [377, 557]], w0: 2.6, w1: 0.7, start: 34.6, dur: 2.2 },
]

// ---- geometry: centripetal-ish Catmull-Rom through the spine points ----
function crSample(pts, per = 12) {
  const out = []
  const p = [pts[0], ...pts, pts[pts.length - 1]]
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = p[i]
    const [x1, y1] = p[i + 1]
    const [x2, y2] = p[i + 2]
    const [x3, y3] = p[i + 3]
    const steps = i === pts.length - 2 ? per + 1 : per
    for (let s = 0; s < steps; s++) {
      const t = s / per
      const t2 = t * t
      const t3 = t2 * t
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(x0, x1, x2, x3), f(y0, y1, y2, y3)])
    }
  }
  return out
}

function buildRoot({ pts }) {
  const S = crSample(pts)
  return S.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

function RootGroup({ item, order }) {
  const spine = buildRoot(item)
  const core = Math.max(1.6, item.w0 * 0.2)
  return (
    <g data-order={order} data-kind="root" data-start={item.start} data-dur={item.dur} className="tree-stroke">
      {/* halo — the root remembers the sunset */}
      <path
        d={spine}
        data-grow
        fill="none"
        stroke="url(#root-glow)"
        strokeWidth={item.w0 * 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.68"
        filter="url(#root-blur)"
        style={{ mixBlendMode: 'screen' }}
      />
      <path
        d={spine}
        data-grow
        fill="none"
        stroke="url(#root-glow)"
        strokeWidth={item.w0 * 0.62}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
        style={{ mixBlendMode: 'screen' }}
      />
      <path
        d={spine}
        data-grow
        fill="none"
        stroke="#ffd2c2"
        strokeWidth={core}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </g>
  )
}

const TreeSketch = memo(function TreeSketch({ svgRef }) {
  let order = 0
  return (
    <svg
      ref={svgRef}
      className="tree-sketch"
      viewBox="0 0 776 621"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 6 }}
    >
      <defs>
        <filter id="root-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g data-layer="roots">
        {ROOTS.map((r) => (
          <RootGroup key={'r' + order} item={r} order={order++} />
        ))}
        {ROOTLETS.map((r) => (
          <RootGroup key={'l' + order} item={r} order={order++} />
        ))}
      </g>
    </svg>
  )
})

export default TreeSketch
