import { memo } from 'react'

const BOARD_W = 776
const BOARD_H = 621

const place = (b) => ({
  left: b.x,
  top: b.y,
  width: b.w,
  height: b.h,
})

function PhotoLayer({ id, data, z, className = '', children }) {
  return (
    <div className={`lyr ${className}`} data-id={id} style={{ ...place(data), zIndex: z }}>
      <img src={data.src} alt="" draggable="false" decoding="async" fetchPriority={z <= 2 ? 'high' : 'auto'} />
      {children}
    </div>
  )
}

const SceneLayers = memo(function SceneLayers({ manifest }) {
  const { sky, reference, mountains, rocks, boulders, canopy, blooms, trunk } = manifest

  return (
    <>
      {/* background sky (segmented, tree removed) */}
      <div className="lyr" data-id="sky" style={{ left: 0, top: 0, width: BOARD_W, height: BOARD_H, zIndex: 1 }}>
        <img src={sky.src} alt="" draggable="false" fetchPriority="high" />
      </div>

      {/* dusk canopy of shade — gives the bark something to stand against */}
      <div
        className="lyr dusk"
        data-id="dusk"
        style={{ left: 0, top: 0, width: BOARD_W, height: BOARD_H, zIndex: 1, opacity: 0 }}
      />

      {/* distant mountains — parallax pair */}
      <PhotoLayer id="mnt-l" data={mountains.left} z={2} />
      <PhotoLayer id="mnt-r" data={mountains.right} z={2} />

      {/* rock formation, one layer per stone */}
      <PhotoLayer id="rock-0" data={rocks[0]} z={3} />
      <PhotoLayer id="rock-1" data={rocks[1]} z={3} />
      <PhotoLayer id="rock-2" data={rocks[2]} z={3} />
      <PhotoLayer id="rock-3" data={boulders[0]} z={3} />
      <PhotoLayer id="rock-4" data={boulders[1]} z={3} />

      {/* warm ground light under the formation */}
      <div
        className="lyr"
        data-id="root-light"
        style={{
          left: 236,
          top: 452,
          width: 320,
          height: 150,
          zIndex: 4,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at 50% 62%, rgba(255,200,180,0.5), rgba(255,150,170,0.22) 45%, transparent 72%)',
          filter: 'blur(14px)',
          mixBlendMode: 'screen',
          opacity: 0,
          willChange: 'opacity, transform',
        }}
      />

      {/* soft aura behind the growing trunk */}
      <div
        className="lyr"
        data-id="trunk-glow"
        style={{
          left: 286,
          top: 268,
          width: 226,
          height: 316,
          zIndex: 5,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at 50% 52%, rgba(255,176,196,0.4), rgba(214,86,132,0.16) 46%, transparent 74%)',
          filter: 'blur(22px)',
          mixBlendMode: 'screen',
          opacity: 0,
          willChange: 'opacity',
        }}
      />

      {/* blossom canopy halo (behind the photographic blossoms) */}
      <div
        className="lyr"
        data-id="canopy-glow"
        style={{
          left: 66,
          top: 40,
          width: 646,
          height: 442,
          zIndex: 7,
          borderRadius: '46% 46% 48% 48% / 52% 52% 40% 40%',
          background:
            'radial-gradient(ellipse at 50% 46%, rgba(255,158,186,0.55), rgba(226,74,132,0.24) 48%, transparent 74%)',
          filter: 'blur(30px)',
          mixBlendMode: 'screen',
          opacity: 0,
          willChange: 'opacity',
        }}
      />

      {/* photographic trunk — a rising organic mask grows the bark out of the stone */}
      <div className="lyr trunk-grow" data-id="trunk-photo" style={{ ...place(trunk), zIndex: 7, '--grow': '0%' }}>
        <div className="trunk-grow__mask">
          <img src={trunk.src} alt="" draggable="false" decoding="async" />
        </div>
        <div className="trunk-grow__front" />
      </div>

      {/* blossom clusters: each piece blooms on its own */}
      {blooms.left.map((b, i) => (
        <PhotoLayer key={'bl' + i} id={`bloom-l-${i}`} data={b} z={8} className="bloom" />
      ))}
      {blooms.right.map((b, i) => (
        <PhotoLayer key={'br' + i} id={`bloom-r-${i}`} data={b} z={8} className="bloom" />
      ))}

      {/* whole lobes settle the cluster mosaic into the heart silhouette */}
      <PhotoLayer id="canopy-l" data={canopy.left} z={9} />
      <PhotoLayer id="canopy-r" data={canopy.right} z={9} />

      {/* the original composition, restored at the end of the journey */}
      <div className="lyr" data-id="reference" style={{ left: 0, top: 0, width: BOARD_W, height: BOARD_H, zIndex: 12, opacity: 0 }}>
        <img src={reference.src} alt="Heartwood — a heart-shaped blossom tree at sunset" draggable="false" decoding="async" />
      </div>
    </>
  )
})

export default SceneLayers
