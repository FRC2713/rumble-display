export class AnimationScheduler {
  private timeout: number | null = null
  private isPaused: boolean = false
  private animationFn: () => void
  private baseInterval: number // in seconds
  private isEnabled: boolean

  constructor(
    animationFn: () => void,
    baseInterval: number,
    isEnabled: boolean = true
  ) {
    this.animationFn = animationFn
    this.baseInterval = baseInterval
    this.isEnabled = isEnabled
  }

  start() {
    if (!this.isEnabled || this.baseInterval <= 0) return

    this.scheduleNext()
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  pause() {
    this.isPaused = true
  }

  resume() {
    this.isPaused = false
  }

  updateInterval(newInterval: number) {
    this.baseInterval = newInterval
  }

  updateEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  private scheduleNext() {
    // Add random variation between -10 and +10 seconds
    const randomVariation = (Math.random() * 20 - 10) * 1000
    const nextInterval = Math.max(1000, this.baseInterval * 1000 + randomVariation)

    this.timeout = setTimeout(() => {
      if (!this.isPaused && this.isEnabled) {
        this.animationFn()
      }
      this.scheduleNext()
    }, nextInterval)
  }
}

export class TableSpinAnimation {
  static createSequentialSpin(
    numTables: number,
    matchesLength: number,
    currentIndex: number,
    setSpinningTableIndex: (index: number | ((prev: number) => number)) => void,
    isPulsing: boolean
  ) {
    return () => {
      // Don't spin if pulsing
      if (isPulsing) return

      const activeMatchesCount = Math.min(numTables, matchesLength - currentIndex)
      if (activeMatchesCount === 0) return

      for (let i = 0; i < activeMatchesCount; i++) {
        setTimeout(() => {
          setSpinningTableIndex(i)
          setTimeout(() => {
            setSpinningTableIndex(prev => prev === i ? -1 : prev)
          }, 1000)
        }, i * 800) // 0.8 second delay between each table
      }
    }
  }
}

export class OnDeckJiggleAnimation {
  static createSequentialJiggle(
    matchesLength: number,
    currentIndex: number,
    setJigglingOnDeckIndex: (index: number | ((prev: number) => number)) => void,
    isPulsing: boolean
  ) {
    return () => {
      // Don't jiggle if pulsing
      if (isPulsing) return

      // Jiggle ALL on-deck matches (all remaining matches after current)
      const onDeckMatchesCount = matchesLength - currentIndex - 1
      if (onDeckMatchesCount <= 0) return

      for (let i = 0; i < onDeckMatchesCount; i++) {
        setTimeout(() => {
          setJigglingOnDeckIndex(i)
          setTimeout(() => {
            setJigglingOnDeckIndex(prev => prev === i ? -1 : prev)
          }, 600) // Duration matches CSS animation
        }, i * 700) // 0.7 second delay between each card
      }
    }
  }
}

export interface ConfettiParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  color: string
  shape: 'regular' | 'lego'
}

export class ConfettiAnimation {
  static createConfetti(): ConfettiParticle[] {
    const useLego = Math.random() < (1.0 / 4.0)

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#61dafb']
    const particles: ConfettiParticle[] = []

    const shape = useLego ? 'lego' : 'regular'
    const nConfetti = (useLego ? 60 : 700) + Math.random() * 100
    for (let i = 0; i < nConfetti; i++) {
      // Spawn at either left or right edge
      const spawnLeft = Math.random() < 0.5
      const yNoise = Math.random() * (window.innerHeight / 2)
      const xNoise = Math.random() * (window.innerWidth / 2) - 5
      const startX = spawnLeft ? (0 + xNoise) : (window.innerWidth - xNoise)

      // Calculate angle towards center
      let angle
      if (spawnLeft) {
        angle = (Math.random() * 90) * (Math.PI / 180) // 0-90 degrees
      } else {
        angle = (90 + Math.random() * 90) * (Math.PI / 180) // 90-180 degrees
      }

      const speed = 1 + Math.random() * 5

      particles.push({
        id: i,
        x: startX,
        y: -yNoise,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shape
      })
    }

    return particles
  }

  static createCombinedConfetti(): ConfettiParticle[] {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#61dafb']
    const particles: ConfettiParticle[] = []

    let particleId = 0

    // Create regular confetti
    const nRegular = 700 + Math.random() * 100
    for (let i = 0; i < nRegular; i++) {
      const spawnLeft = Math.random() < 0.5
      const yNoise = Math.random() * (window.innerHeight / 2)
      const xNoise = Math.random() * (window.innerWidth / 2) - 5
      const startX = spawnLeft ? (0 + xNoise) : (window.innerWidth - xNoise)

      let angle
      if (spawnLeft) {
        angle = (Math.random() * 90) * (Math.PI / 180)
      } else {
        angle = (90 + Math.random() * 90) * (Math.PI / 180)
      }

      const speed = 1 + Math.random() * 5

      particles.push({
        id: particleId++,
        x: startX,
        y: -yNoise,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: 'regular'
      })
    }

    // Create LEGO confetti
    const nLego = 60 + Math.random() * 100
    for (let i = 0; i < nLego; i++) {
      const spawnLeft = Math.random() < 0.5
      const yNoise = Math.random() * (window.innerHeight / 2)
      const xNoise = Math.random() * (window.innerWidth / 2) - 5
      const startX = spawnLeft ? (0 + xNoise) : (window.innerWidth - xNoise)

      let angle
      if (spawnLeft) {
        angle = (Math.random() * 90) * (Math.PI / 180)
      } else {
        angle = (90 + Math.random() * 90) * (Math.PI / 180)
      }

      const speed = 1 + Math.random() * 5

      particles.push({
        id: particleId++,
        x: startX,
        y: -yNoise,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: 'lego'
      })
    }

    return particles
  }

  static updateConfetti(particles: ConfettiParticle[], deltaTime: number): ConfettiParticle[] {
    const gravity = 0.5 // pixels per frame squared

    const updated = particles.map(particle => ({
      ...particle,
      x: particle.x + particle.vx * deltaTime,
      y: particle.y + particle.vy * deltaTime,
      vy: particle.vy + gravity * deltaTime, // Apply gravity
      rotation: particle.rotation + particle.rotationSpeed * deltaTime
    }))

    // Filter out particles that are off screen
    return updated.filter(p => p.y < window.innerHeight + 100)
  }
}
