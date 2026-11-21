import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SceneLayers from './SceneLayers'
import TreeSketch from './TreeSketch'
import Atmosphere from './Atmosphere'
 
gsap.registerPlugin(ScrollTrigger)

const CHAPTERS = [
  {
    key: 'c1', num: 'Chapter I', title: 'The still sky',
    copy: 'Before the world drew breath, the sky held its colour a little longer.',
    in: 2.4, out: 12.5,
  },
  {
    key: 'c2', num: 'Chapter II', title: 'The sleeping stone',
    copy: 'Stone remembers the weight of the mountain it once was.',
    in: 15, out: 26.5,
  },
  {
    key: 'c3', num: 'Chapter III', title: 'Roots remember',
    copy: 'Roots are promises the earth keeps below the light.',
    in: 28.5, out: 39.5,
  },
  {
    key: 'c4', num: 'Chapter IV', title: 'The twisted heart',
    copy: 'Two limbs that would not grow apart — the tree’s first vow.',
    in: 42.5, out: 54.5,
  },
  {
    key: 'c5', num: 'Chapter V', title: 'A million blossoms',
    copy: 'Every blossom holds a wish someone was too shy to speak.',
    in: 58.5, out: 80,
  },
]

export default function Experience({ manifest, reducedMotion }) {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const cameraRef = useRef(null)
  const sketchRef = useRef(null)
  const sceneRef = useRef({
    progress: 0, camScale: 1, camX: 0, camY: 0, boardScale: 1, by: 0, vw: 0, vh: 0,
  })

  useEffect(() => {
    const stage = stageRef.current
    const camera = cameraRef.current
    const section = sectionRef.current
    const scene = sceneRef.current

    const layout = () => {
      const sw = stage.clientWidth
      const sh = stage.clientHeight
      const portrait = sh > sw * 1.04
      let scale
      let by
      if (portrait) {
        // overscan the width so the artboard's side fades sit off-screen and
        // the composition reads as full-bleed rather than a floating card
        scale = (sw / 776) * 1.32
        by = -sh * 0.02
      } else {
        scale = (sh / 621) * 1.04
        by = 0
      }
      stage.style.setProperty('--bs', scale.toFixed(5))
      stage.style.setProperty('--by', `${by.toFixed(1)}px`)
      scene.boardScale = scale
      scene.by = by
      scene.vw = sw
      scene.vh = sh
    }
    layout()

    // prepare organic stroke growth
    const groups = Array.from(sketchRef.current.querySelectorAll('[data-order]'))
    groups.forEach((g) => {
      const paths = g.querySelectorAll('[data-grow]')
      if (!paths.length) return
      const len = paths[0].getTotalLength() + 2
      g.dataset.len = len
      // park the offset past the end so round caps can't peek through
      paths.forEach((p) => {
        p.style.strokeDasharray = `${len} ${len + 4}`
        p.style.strokeDashoffset = `${len + 4}`
      })
    })

    const q = (id) => stage.querySelector(`[data-id="${id}"]`)
    const qa = (sel) => gsap.utils.toArray(stage.querySelectorAll(sel))

    const nodes = {
      bgImg: stage.querySelector('.bg-ext img'),
      sceneDark: stage.querySelector('.scene-dark'),
      sky: q('sky'),
      mntL: q('mnt-l'),
      mntR: q('mnt-r'),
      rocks: [q('rock-0'), q('rock-1'), q('rock-2'), q('rock-3'), q('rock-4')],
      rootLight: q('root-light'),
      trunkGlow: q('trunk-glow'),
      canopyGlow: q('canopy-glow'),
      trunkPhoto: q('trunk-photo'),
      trunkFront: stage.querySelector('.trunk-grow__front'),
      canopyL: q('canopy-l'),
      canopyR: q('canopy-r'),
      reference: q('reference'),
      bloomsL: qa('[data-id^="bloom-l-"]'),
      bloomsR: qa('[data-id^="bloom-r-"]'),
      rays: stage.querySelector('.rays'),
      fogHorizon: stage.querySelector('.fog--horizon'),
      fogGround: stage.querySelector('.fog--ground'),
      fogLow: stage.querySelector('.fog--low'),
      hero: q('hero'),
      cue: q('cue'),
      finalTitle: q('final-title'),
      finalScrim: q('final-scrim'),
      progressFill: q('progress-fill'),
      progress: stage.querySelector('.progress'),
      progressPct: q('progress-pct'),
      table: q('topbar-meta'),
      dusk: q('dusk'),
      baseScrim: stage.querySelector('.base-scrim'),
      grade: stage.querySelector('.grade'),
      introVeil: stage.querySelector('.intro-veil'),
      introSkip: stage.querySelector('.intro-skip'),
    }

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(
          [nodes.bgImg, nodes.sky, nodes.mntL, nodes.mntR, ...nodes.rocks, nodes.trunkPhoto,
            nodes.canopyL, nodes.canopyR, nodes.reference, ...nodes.bloomsL, ...nodes.bloomsR],
          { opacity: 1 }
        )
        gsap.set([nodes.rootLight, nodes.trunkGlow, nodes.canopyGlow], { opacity: 0.4 })
        gsap.set(nodes.trunkPhoto, { '--grow': '118%' })
        gsap.set(nodes.dusk, { opacity: 0.9 })
        gsap.set(nodes.baseScrim, { opacity: 0 })
        gsap.set(nodes.grade, { opacity: 0 })
        gsap.set(nodes.trunkFront, { opacity: 0 })
        gsap.set([nodes.fogHorizon, nodes.fogGround, nodes.fogLow], { opacity: 0.4 })
        gsap.set(nodes.rays, { opacity: 0.3 })
        gsap.set(nodes.sceneDark, { opacity: 0 })
        gsap.set(nodes.finalTitle, { opacity: 1 })
        gsap.set(nodes.finalScrim, { opacity: 0.85 })
        gsap.set([nodes.hero, nodes.cue, nodes.progress], { opacity: 0 })
        gsap.set(gsap.utils.toArray('.chapter'), { opacity: 0 })
        groups.forEach((g) => g.querySelectorAll('[data-grow]').forEach((p) => (p.style.strokeDashoffset = '0')))
        return
      }

      const portraitNow = () => stage.clientHeight > stage.clientWidth * 1.04

      // ---------------- initial state ----------------
      const applyInitialState = () => {
        gsap.set(nodes.bgImg, { opacity: 0 })
        gsap.set(nodes.sky, { opacity: 0, scale: 1.16 })
        gsap.set([nodes.mntL, nodes.mntR], { opacity: 0, y: 26 })
        gsap.set(nodes.mntL, { x: -16, scale: 1.06 })
        gsap.set(nodes.mntR, { x: 16, scale: 1.06 })
        gsap.set(nodes.rocks, { opacity: 0, y: 78, scale: 0.9 })
        gsap.set([nodes.fogHorizon, nodes.fogGround, nodes.fogLow], { opacity: 0 })
        gsap.set([nodes.rootLight, nodes.trunkGlow, nodes.canopyGlow], { opacity: 0 })
        gsap.set(nodes.trunkPhoto, { '--grow': '0%' })
        gsap.set(nodes.trunkFront, { opacity: 0 })
        gsap.set([nodes.canopyL, nodes.canopyR], { opacity: 0, scale: 1.06 })
        gsap.set([...nodes.bloomsL, ...nodes.bloomsR], { opacity: 0, scale: 0.52, y: 7, transformOrigin: '50% 50%' })
        gsap.set(nodes.reference, { opacity: 0, scale: 1.015, transformOrigin: '50% 50%' })
        gsap.set(nodes.sceneDark, { opacity: 1 })
        gsap.set(nodes.dusk, { opacity: 0 })
        gsap.set(nodes.baseScrim, { opacity: 0 })
        gsap.set(nodes.grade, { opacity: 0 })
        gsap.set(nodes.rays, { opacity: 0, scale: 1.12 })
        gsap.set(gsap.utils.toArray('.chapter'), { opacity: 0, y: 22 })
        gsap.set(nodes.finalTitle, { opacity: 0, y: 26 })
        gsap.set(nodes.finalScrim, { opacity: 0 })
        gsap.set(camera, { scale: portraitNow() ? 1.07 : 1.15, y: 10 })
        // park the root strokes hidden again (the intro may have grown them)
        groups.forEach((g) => {
          const len = parseFloat(g.dataset.len) || 0
          g.querySelectorAll('[data-grow]').forEach((p) => {
            p.style.strokeDashoffset = `${len + 4}`
          })
        })
      }
      applyInitialState()

      // ambient drift (non-scroll loops, transform only)
      gsap.to('.fog--horizon', { yPercent: 4, duration: 14, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      gsap.to('.fog--ground', { yPercent: -6, duration: 18, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      gsap.to('.fog--low', { yPercent: -5, duration: 16, yoyo: true, repeat: -1, ease: 'sine.inOut' })

      // camera → scene sync for the particle canvas (follows the intro camera too)
      const sync = () => {
        scene.camScale = Number(gsap.getProperty(camera, 'scaleX')) || 1
        scene.camX = Number(gsap.getProperty(camera, 'x')) || 0
        scene.camY = Number(gsap.getProperty(camera, 'y')) || 0
      }
      gsap.ticker.add(sync)
      sync()

      // ---------------- scroll experience ----------------
      // built only once, on intro handoff, so nothing scrubs beneath the intro
      let scrollBuilt = false
      const buildScroll = () => {
        if (scrollBuilt) return
        scrollBuilt = true

        // ---------------- master scroll timeline ----------------
        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.05,
            pin: stage,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              scene.progress = self.progress
              if (nodes.progressFill) nodes.progressFill.style.transform = `scaleY(${self.progress.toFixed(4)})`
              if (nodes.progressPct) nodes.progressPct.textContent = `${String(Math.round(self.progress * 100)).padStart(2, '0')}`
            },
          },
        })

        // PHASE 1 — environment
        tl.to(nodes.sceneDark, { opacity: 0, duration: 8, ease: 'power1.inOut' }, 0)
        tl.to(nodes.bgImg, { opacity: 1, duration: 6, ease: 'power1.out' }, 0.5)
        tl.to(nodes.sky, { opacity: 1, scale: 1.01, duration: 10, ease: 'power1.out' }, 0.6)
        tl.to(nodes.fogHorizon, { opacity: 0.32, duration: 7 }, 2.5)
        tl.to(nodes.mntL, { opacity: 0.92, y: 0, x: 0, scale: 1, duration: 9, ease: 'power2.out' }, 3)
        tl.to(nodes.mntR, { opacity: 0.92, y: 0, x: 0, scale: 1, duration: 9, ease: 'power2.out' }, 4)
        tl.to(nodes.fogGround, { opacity: 0.34, duration: 8 }, 6)
        tl.to(nodes.dusk, { opacity: 0.9, duration: 12, ease: 'power1.out' }, 10)
        tl.to(nodes.grade, { opacity: 0.5, duration: 14, ease: 'power1.out' }, 8)
        tl.to(nodes.grade, { opacity: 0, duration: 16, ease: 'power1.inOut' }, 80)
        tl.to(nodes.hero, { opacity: 0, y: -34, duration: 4.2, ease: 'power1.in' }, 0.2)
        tl.to(nodes.cue, { opacity: 0, duration: 2.2, ease: 'power1.in' }, 0.4)

        // PHASE 2 — rock formation
        const rockTimes = [15.6, 13.4, 17, 20.4, 22]
        nodes.rocks.forEach((rock, i) => {
          if (!rock) return
          tl.to(rock, { opacity: 1, y: 0, scale: 1, duration: 6.4, ease: 'power2.out' }, rockTimes[i])
          tl.to(rock, { y: -4, duration: 14, ease: 'sine.inOut' }, rockTimes[i] + 6.4)
        })
        tl.to(nodes.rootLight, { opacity: 0.34, duration: 8 }, 20)
        tl.to(nodes.baseScrim, { opacity: 1, duration: 3, ease: 'power1.out' }, 23)

        // PHASE 3 — roots
        groups
          .filter((g) => g.dataset.kind === 'root')
          .forEach((g) => {
            const start = parseFloat(g.dataset.start)
            const dur = parseFloat(g.dataset.dur)
            tl.to(g.querySelectorAll('[data-grow]'), { strokeDashoffset: 0, duration: dur, ease: 'none' }, start)
          })
        tl.to(nodes.rootLight, { opacity: 0.5, duration: 10 }, 30)
        // the bark base surfaces first, so the roots grow from real wood
        tl.to(nodes.trunkPhoto, { '--grow': '16%', duration: 7.5, ease: 'power2.out' }, 29)
        tl.to(nodes.baseScrim, { opacity: 0, duration: 5, ease: 'power1.in' }, 39)

        // PHASE 4 — the photographic trunk grows out of the stone
        tl.to(nodes.trunkPhoto, { '--grow': '118%', duration: 17, ease: 'power1.inOut' }, 40.2)
        tl.to(nodes.trunkFront, { opacity: 0.8, duration: 2.6, ease: 'power1.out' }, 40.2)
        tl.to(nodes.trunkFront, { opacity: 0, duration: 4, ease: 'power1.in' }, 53.5)
        tl.to(nodes.trunkGlow, { opacity: 0.6, duration: 12 }, 42)

        // PHASE 5 — canopy formation
        tl.to(nodes.canopyGlow, { opacity: 0.66, duration: 9 }, 58)
        nodes.bloomsL.forEach((el, i) => {
          tl.to(el, { opacity: 1, scale: 1, y: 0, duration: 5.4, ease: 'power2.out' }, 58.8 + i * 0.6)
        })
        nodes.bloomsR.forEach((el, i) => {
          tl.to(el, { opacity: 1, scale: 1, y: 0, duration: 5.4, ease: 'power2.out' }, 60 + i * 0.6)
        })
        tl.to([nodes.canopyL, nodes.canopyR], { opacity: 1, scale: 1, duration: 8, ease: 'power2.out' }, 66.5)
        tl.to(nodes.canopyGlow, { opacity: 0.46, duration: 9 }, 76)

        // PHASE 6 — final reveal
        tl.to(nodes.reference, { opacity: 1, scale: 1, duration: 10, ease: 'power2.inOut' }, 84)
        tl.to(nodes.rays, { opacity: 0.55, scale: 1, duration: 12, ease: 'power2.in' }, 86)
        tl.to(nodes.fogLow, { opacity: 0.5, duration: 12 }, 87)
        tl.to(nodes.finalTitle, { opacity: 1, y: 0, duration: 6, ease: 'power2.out' }, 90)
        tl.to(nodes.finalScrim, { opacity: 1, duration: 9, ease: 'power1.inOut' }, 87)

        // cinematic camera: settle → dive to the roots → pull back through the
        // growing trunk → drift in for the finale
        tl.fromTo(
          camera,
          { scale: () => (portraitNow() ? 1.05 : 1.15), y: 10 },
          { scale: () => (portraitNow() ? 1.0 : 1.0), y: 0, duration: 22, ease: 'power1.out' },
          0
        )
        tl.fromTo(
          camera,
          { scale: 1, y: 0 },
          {
            scale: () => (portraitNow() ? 1.42 : 1.62),
            y: () => -stage.clientHeight * (portraitNow() ? 0.075 : 0.36),
            duration: 11,
            ease: 'power2.inOut',
            immediateRender: false,
          },
          23
        )
        tl.fromTo(
          camera,
          {
            scale: () => (portraitNow() ? 1.42 : 1.62),
            y: () => -stage.clientHeight * (portraitNow() ? 0.075 : 0.36),
          },
          { scale: 1.02, y: 0, duration: 16, ease: 'power2.inOut', immediateRender: false },
          40
        )
        tl.fromTo(
          camera,
          { scale: 1.02, y: 0 },
          { scale: () => (portraitNow() ? 1.03 : 1.06), y: -4, duration: 30, ease: 'power1.inOut', immediateRender: false },
          70
        )

        // chapters
        const chapters = gsap.utils.toArray('.chapter')
        chapters.forEach((el) => {
          const c = CHAPTERS.find((x) => x.key === el.dataset.chapter)
          if (!c) return
          tl.to(el, { opacity: 1, y: 0, duration: 2.4, ease: 'power2.out' }, c.in)
          tl.to(el, { opacity: 0, y: -16, duration: 2.2, ease: 'power1.in' }, c.out - 2.2)
        })

        tl.to({}, { duration: 0.001 }, 100)
      }

      // ---------------- cinematic intro ----------------
      // Independent autoplay timeline: it never reads scroll and reuses the
      // same layers the scroll experience later animates.
      const rootEl = document.documentElement
      const skipEl = nodes.introSkip
      const veilEl = nodes.introVeil
      let introTl = null
      let introStarted = false
      let introDone = false
      let disposed = false
      let startTimer = 0

      const blockScroll = (e) => e.preventDefault()
      const lockScroll = () => {
        rootEl.classList.add('intro-lock')
        window.addEventListener('wheel', blockScroll, { passive: false })
        window.addEventListener('touchmove', blockScroll, { passive: false })
      }
      const unlockScroll = () => {
        rootEl.classList.remove('intro-lock')
        window.removeEventListener('wheel', blockScroll)
        window.removeEventListener('touchmove', blockScroll)
      }

      // the hero, cue and progress belong to the scroll act, not the opening
      gsap.set([nodes.hero, nodes.cue, nodes.progress], { opacity: 0 })
      gsap.set(skipEl, { opacity: 0, pointerEvents: 'none' })
      gsap.set(veilEl, { opacity: 0 })
      lockScroll()

      const startScrollExperience = () => {
        unlockScroll()
        window.scrollTo(0, 0)
        layout()
        scene.progress = 0
        if (nodes.progressFill) nodes.progressFill.style.transform = 'scaleY(0)'
        if (nodes.progressPct) nodes.progressPct.textContent = '00'
        gsap.set([nodes.hero, nodes.cue, nodes.progress], { opacity: 1 })
        gsap.set(skipEl, { display: 'none' })
        applyInitialState()
        buildScroll()
        requestAnimationFrame(() => ScrollTrigger.refresh())
      }

      const finishIntro = (quick = false) => {
        if (introDone) return
        introDone = true
        if (introTl) introTl.kill()
        gsap.to(skipEl, { opacity: 0, duration: 0.3, ease: 'power1.out', overwrite: 'auto' })

        // veil out the auto-played finale and veil in the scroll opening, so
        // the handoff reads as a cut rather than a reset
        const veilIn = quick ? 0.45 : 0.85
        const veilOut = quick ? 0.9 : 1.5
        const tl = gsap.timeline()
        tl.to(veilEl, { opacity: 1, duration: veilIn, ease: 'power2.inOut' }, 0)
        tl.call(startScrollExperience, null, veilIn)
        tl.to(veilEl, { opacity: 0, duration: veilOut, ease: 'power2.inOut' }, veilIn + 0.1)
      }

      const onSkip = () => finishIntro(true)
      skipEl?.addEventListener('click', onSkip)

      const buildIntro = () => {
        const isPortrait = portraitNow()
        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } })

        // PHASE 1 — the sky remembers
        tl.to(nodes.sceneDark, { opacity: 0, duration: 3.2, ease: 'power1.inOut' }, 0.35)
        tl.to(nodes.bgImg, { opacity: 1, duration: 2.8, ease: 'power1.out' }, 0.5)
        tl.to(nodes.sky, { opacity: 1, scale: 1.01, duration: 3.4, ease: 'power1.out' }, 0.8)
        tl.to(nodes.fogHorizon, { opacity: 0.32, duration: 2.4 }, 2.2)
        tl.to(nodes.mntL, { opacity: 0.92, y: 0, x: 0, scale: 1, duration: 2.8, ease: 'power2.out' }, 1.9)
        tl.to(nodes.mntR, { opacity: 0.92, y: 0, x: 0, scale: 1, duration: 2.8, ease: 'power2.out' }, 2.4)
        tl.to(nodes.fogGround, { opacity: 0.34, duration: 2.6 }, 2.6)
        tl.to(nodes.dusk, { opacity: 0.9, duration: 3.6, ease: 'power1.out' }, 2.8)
        tl.to(nodes.grade, { opacity: 0.5, duration: 3.6, ease: 'power1.out' }, 2.4)

        // camera: settle → dive into the stone → rise with the trunk → drift in
        tl.fromTo(
          camera,
          { scale: isPortrait ? 1.08 : 1.18, y: 12 },
          { scale: 1, y: 0, duration: 3.8, ease: 'power1.out' },
          0
        )
        tl.fromTo(
          camera,
          { scale: 1, y: 0 },
          {
            scale: isPortrait ? 1.36 : 1.58,
            y: -stage.clientHeight * (isPortrait ? 0.07 : 0.34),
            duration: 4.2,
            ease: 'power2.inOut',
            immediateRender: false,
          },
          3.8
        )
        tl.fromTo(
          camera,
          {
            scale: isPortrait ? 1.36 : 1.58,
            y: -stage.clientHeight * (isPortrait ? 0.07 : 0.34),
          },
          { scale: 1.02, y: 0, duration: 5.2, ease: 'power2.inOut', immediateRender: false },
          8
        )
        tl.fromTo(
          camera,
          { scale: 1.02, y: 0 },
          {
            scale: isPortrait ? 1.035 : 1.055,
            y: -5,
            duration: 6.9,
            ease: 'power1.inOut',
            immediateRender: false,
          },
          13.2
        )

        // PHASE 2 — the stones wake
        const rockTimes = [3.9, 3.5, 4.3, 4.9, 5.4]
        nodes.rocks.forEach((rock, i) => {
          if (!rock) return
          tl.to(rock, { opacity: 1, y: 0, scale: 1, duration: 2.8, ease: 'power2.out' }, rockTimes[i])
        })
        tl.to(nodes.rootLight, { opacity: 0.34, duration: 2.6 }, 5)
        tl.to(nodes.baseScrim, { opacity: 1, duration: 1.5, ease: 'power1.out' }, 5.6)
        tl.to(nodes.baseScrim, { opacity: 0, duration: 2, ease: 'power1.in' }, 9.6)

        // PHASE 3 — the roots remember (SVG stroke growth)
        groups
          .filter((g) => g.dataset.kind === 'root')
          .forEach((g) => {
            const start = 5.7 + (parseFloat(g.dataset.start) - 27.2) * 0.34
            const dur = parseFloat(g.dataset.dur) * 0.4
            tl.to(g.querySelectorAll('[data-grow]'), { strokeDashoffset: 0, duration: dur, ease: 'none' }, start)
          })
        tl.to(nodes.rootLight, { opacity: 0.5, duration: 3.4 }, 7)
        tl.to(nodes.trunkPhoto, { '--grow': '14%', duration: 2, ease: 'power2.out' }, 8.2)

        // PHASE 4 — the trunk climbs (organic mask reveal)
        tl.to(nodes.trunkPhoto, { '--grow': '118%', duration: 4.6, ease: 'power1.inOut' }, 9.2)
        tl.to(nodes.trunkFront, { opacity: 0.8, duration: 0.9, ease: 'power1.out' }, 9.2)
        tl.to(nodes.trunkFront, { opacity: 0, duration: 1.6, ease: 'power1.in' }, 12.1)
        tl.to(nodes.trunkGlow, { opacity: 0.6, duration: 3.6 }, 9.8)

        // PHASE 5 — a million blossoms
        tl.to(nodes.canopyGlow, { opacity: 0.66, duration: 3.2 }, 11.7)
        nodes.bloomsL.forEach((el, i) => {
          tl.to(el, { opacity: 1, scale: 1, y: 0, duration: 2.2, ease: 'power2.out' }, 12 + i * 0.16)
        })
        nodes.bloomsR.forEach((el, i) => {
          tl.to(el, { opacity: 1, scale: 1, y: 0, duration: 2.2, ease: 'power2.out' }, 12.4 + i * 0.16)
        })
        tl.to(nodes.canopyGlow, { opacity: 0.8, duration: 1.8, ease: 'power2.out' }, 14.4)
        tl.to([nodes.canopyL, nodes.canopyR], { opacity: 1, scale: 1, duration: 2.6, ease: 'power2.out' }, 14.6)
        tl.to(nodes.canopyGlow, { opacity: 0.46, duration: 2.4 }, 16.2)

        // PHASE 6 — the legend restored
        tl.to(nodes.reference, { opacity: 1, scale: 1, duration: 2.6, ease: 'power2.inOut' }, 15.6)
        tl.to(nodes.rays, { opacity: 0.55, scale: 1, duration: 2.8, ease: 'power2.in' }, 15.9)
        tl.to(nodes.fogLow, { opacity: 0.5, duration: 2.6 }, 16.2)
        tl.to(nodes.finalScrim, { opacity: 1, duration: 2.4, ease: 'power1.inOut' }, 16.4)
        tl.to(nodes.finalTitle, { opacity: 1, y: 0, duration: 1.8, ease: 'power2.out' }, 16.9)

        // particles wake with the tree: sparks with the stone, petals with the
        // blossom clusters, hearts once the canopy fills
        tl.to(scene, { progress: 0.16, duration: 4.4, ease: 'none' }, 0)
        tl.to(scene, { progress: 0.5, duration: 3.4, ease: 'none' }, 4.4)
        tl.to(scene, { progress: 0.78, duration: 5, ease: 'power1.inOut' }, 7.8)
        tl.to(scene, { progress: 0.92, duration: 5, ease: 'power1.inOut' }, 12.8)

        tl.set(skipEl, { pointerEvents: 'auto' }, 1.4)
        tl.to(skipEl, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 2.2)

        // hold the finished tree, then hand off to the scroll experience
        tl.call(() => finishIntro(false), null, 20.4)
        return tl
      }

      // wait for every layer to decode so no beat of the opening can hitch;
      // the cap keeps a slow decoder from stalling the intro
      const beginIntro = () => {
        if (disposed || introStarted) return
        introStarted = true
        window.clearTimeout(startTimer)
        introTl = buildIntro()
      }
      const introImgs = Array.from(stage.querySelectorAll('img'))
      Promise.allSettled(
        introImgs.map((img) => (img.decode ? img.decode() : Promise.resolve()))
      ).then(beginIntro)
      startTimer = window.setTimeout(beginIntro, 1100)

      return () => {
        disposed = true
        window.clearTimeout(startTimer)
        unlockScroll()
        skipEl?.removeEventListener('click', onSkip)
        gsap.ticker.remove(sync)
      }
    })

    let resizeTimer = 0
    const onResize = () => {
      layout()
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    // fonts settle → keep pin geometry correct
    if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      clearTimeout(resizeTimer)
      ctx.revert()
    }
  }, [manifest, reducedMotion])

  return (
    <section
      ref={sectionRef}
      className="experience relative"
      style={{ height: reducedMotion ? '100vh' : '760vh' }}
    >
      <div ref={stageRef} className="stage">
        <div className="bg-ext">
          <img src={manifest.sky.src} alt="" aria-hidden="true" />
        </div>

        <div ref={cameraRef} className="camera">
          <div className="artboard">
            <SceneLayers manifest={manifest} />
            <TreeSketch svgRef={sketchRef} />
          </div>
        </div>

        <div className="fog fog--horizon" />
        <div className="fog fog--ground" />
        <div className="fog fog--low" />
        <div className="base-scrim" />
        <div className="grade" />
        <div className="rays" />

        <Atmosphere sceneRef={sceneRef} />

        <header className="topbar">
          <span className="brand">Heartwood</span>
          <span className="topbar__meta" data-id="topbar-meta">
            A scrolling legend · MMXXVI
          </span>
        </header>

        <div className="vignette" />
        <div className="grain" />

        {/* intro title */}
        <div
          data-id="hero"
          className="absolute inset-0 z-[23] flex flex-col items-center justify-center text-center px-6 pointer-events-none"
        >
          <p className="eyebrow mb-6">The legend of the blossom tree</p>
          <h1 className="hero-title">Heartwood</h1>
          <p
            className="mt-7 max-w-md text-[0.66rem] sm:text-[0.7rem] leading-relaxed tracking-[0.34em] uppercase"
            style={{ color: 'rgba(255,226,236,0.55)' }}
          >
            A cinematic descent into a myth
          </p>
        </div>

        <div data-id="cue" className="scroll-cue">
          <span>Scroll to awaken</span>
          <i />
        </div>

        {CHAPTERS.map((c) => (
          <div key={c.key} className="chapter" data-chapter={c.key}>
            <div className="chapter__num">{c.num}</div>
            <h2 className="chapter__title">{c.title}</h2>
            <p className="chapter__copy">{c.copy}</p>
          </div>
        ))}

        <div data-id="final-title" className="final-title">
          <h2>Heartwood</h2>
          <p>The tree that grew from a promise</p>
        </div>
        <div data-id="final-scrim" className="final-scrim" />

        <div className="progress" aria-hidden="true">
          <div data-id="progress-fill" className="progress__fill" />
          <span data-id="progress-pct" className="progress__pct">00</span>
        </div>

        <button type="button" data-id="intro-skip" className="intro-skip">
          Skip intro
        </button>
        <div data-id="intro-veil" className="intro-veil" aria-hidden="true" />
      </div>
    </section>
  )
}
