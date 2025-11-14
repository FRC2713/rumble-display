import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import {
  AnimationScheduler,
  TableSpinAnimation,
  OnDeckJiggleAnimation,
  ConfettiAnimation,
  type ConfettiParticle
} from './animations'

interface Match {
  number: number
  red: string
  blue: string
}

function App() {
  const [matches, setMatches] = useState<Match[]>([])
  const [numTables, setNumTables] = useState<number>(3)
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [startMatchInput, setStartMatchInput] = useState<string>('')
  const [endMatchInput, setEndMatchInput] = useState<string>('')
  const [isPulsing, setIsPulsing] = useState<boolean>(false)
  const [spinningTableIndex, setSpinningTableIndex] = useState<number>(-1)
  const [jigglingOnDeckIndex, setJigglingOnDeckIndex] = useState<number>(-1)
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef<number>(0)

  const [tableSpinInterval, setTableSpinInterval] = useState<number>(480)
  const [onDeckJiggleInterval, setOnDeckJiggleInterval] = useState<number>(420)
  const [pulseDuration, setPulseDuration] = useState<number>(30)
  const [tableSpinEnabled, setTableSpinEnabled] = useState<boolean>(true)
  const [onDeckJiggleEnabled, setOnDeckJiggleEnabled] = useState<boolean>(true)

  // ======= CSV File Upload =======
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())

      const parsedMatches: Match[] = lines.map(line => {
        const [number, red, blue] = line.split(',').map(s => s.trim())
        return {
          number: parseInt(number),
          red,
          blue
        }
      }).filter(match => !isNaN(match.number))

      setMatches(parsedMatches)
      setCurrentIndex(0)
    }
    reader.readAsText(file)
  }

  // ======= Current Match Managing =======
  const cycleMatches = () => {
    if (currentIndex + numTables < matches.length) {
      setCurrentIndex(currentIndex + numTables)
      setIsPulsing(true)
      setTimeout(() => {
        setIsPulsing(false)
      }, pulseDuration * 1000)
    }
  }

  const handleMatchIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setStartMatchInput(inputValue)

    if (inputValue === '') return // Allow empty value without updating

    const value = parseInt(inputValue)
    if (!isNaN(value) && value >= 1 && value <= matches.length) {
      setCurrentIndex(value - 1) // Convert to 0-based index
    }
  }

  const handleEndMatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setEndMatchInput(inputValue)

    if (inputValue === '') return // Allow empty value without updating

    const value = parseInt(inputValue)
    if (!isNaN(value) && value >= 1 && value <= matches.length) {
      // Calculate the starting index based on the end match
      const endIndex = value - 1
      const startIndex = Math.max(0, endIndex - numTables + 1)
      setCurrentIndex(startIndex)
    }
  }

  // Sync input values with currentIndex and numTables
  useEffect(() => {
    setStartMatchInput(String(currentIndex + 1))
    setEndMatchInput(String(Math.min(currentIndex + numTables, matches.length)))
  }, [currentIndex, numTables, matches.length])

  // ======= Confetti =======
  const createConfetti = useCallback(() => {
    const particles = ConfettiAnimation.createConfetti()
    setConfettiParticles(particles)
  }, [])

  const animate = useCallback((currentTime: number) => {
    const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 16.67 : 1 // Normalize to 60fps
    lastTimeRef.current = currentTime

    setConfettiParticles(prev => ConfettiAnimation.updateConfetti(prev, deltaTime))

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        createConfetti()
        lastTimeRef.current = 0
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate, createConfetti])

  useEffect(() => {
    if (confettiParticles.length === 0 && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
  }, [confettiParticles])

  // ======= Table Animations =======
  useEffect(() => {
    if (matches.length === 0 || tableSpinInterval <= 0 || !tableSpinEnabled) return

    const spinAnimation = TableSpinAnimation.createSequentialSpin(
      numTables,
      matches.length,
      currentIndex,
      setSpinningTableIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(spinAnimation, tableSpinInterval, tableSpinEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, tableSpinInterval, numTables, currentIndex, isPulsing, tableSpinEnabled])

  // ======= On-Deck Animations =======
  useEffect(() => {
    if (matches.length === 0 || onDeckJiggleInterval <= 0 || !onDeckJiggleEnabled) return

    const jiggleAnimation = OnDeckJiggleAnimation.createSequentialJiggle(
      numTables,
      matches.length,
      currentIndex,
      setJigglingOnDeckIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(jiggleAnimation, onDeckJiggleInterval, onDeckJiggleEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, onDeckJiggleInterval, numTables, currentIndex, onDeckJiggleEnabled, isPulsing])

  const activeMatches = matches.slice(currentIndex, currentIndex + numTables)
  const onDeckMatches = matches.slice(currentIndex + numTables, currentIndex + numTables * 2)

  if (matches.length === 0) {
    return (
      <div className="upload-container">
        <h1>Match Display System</h1>
        <div className="upload-section">
          <label htmlFor="csv-upload" className="upload-label">
            Upload CSV File
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
          />
          <p className="instructions">
            CSV Format: Match Number, Red Team, Blue Team
          </p>

          <div className="animation-config">
            <h3>Animation Settings</h3>

            <div className="config-group">
              <label htmlFor="table-spin">
                Table Animation Interval: {tableSpinInterval}s
              </label>
              <div className="slider-row">
                <div className="slider-container">
                  <span className="slider-label">Often</span>
                  <input
                    id="table-spin"
                    type="range"
                    min="30"
                    max="600"
                    value={tableSpinInterval}
                    onChange={(e) => setTableSpinInterval(parseInt(e.target.value))}
                    className="config-slider"
                    disabled={!tableSpinEnabled}
                  />
                  <span className="slider-label">Sparse</span>
                </div>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={tableSpinEnabled}
                    onChange={(e) => setTableSpinEnabled(e.target.checked)}
                    className="config-checkbox"
                  />
                  <span className="checkbox-label">Enable</span>
                </label>
              </div>
            </div>

            <div className="config-group">
              <label htmlFor="ondeck-jiggle">
                On-Deck Animation Interval: {onDeckJiggleInterval}s
              </label>
              <div className="slider-row">
                <div className="slider-container">
                  <span className="slider-label">Often</span>
                  <input
                    id="ondeck-jiggle"
                    type="range"
                    min="30"
                    max="600"
                    value={onDeckJiggleInterval}
                    onChange={(e) => setOnDeckJiggleInterval(parseInt(e.target.value))}
                    className="config-slider"
                    disabled={!onDeckJiggleEnabled}
                  />
                  <span className="slider-label">Sparse</span>
                </div>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={onDeckJiggleEnabled}
                    onChange={(e) => setOnDeckJiggleEnabled(e.target.checked)}
                    className="config-checkbox"
                  />
                  <span className="checkbox-label">Enable</span>
                </label>
              </div>
            </div>

            <div className="config-group">
              <label htmlFor="pulse-duration">Pulse Duration (seconds):</label>
              <input
                id="pulse-duration"
                type="number"
                min="0"
                value={pulseDuration}
                onChange={(e) => setPulseDuration(parseInt(e.target.value) || 0)}
                className="config-input"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="display-container">
      {confettiParticles.length > 0 && (
        <div className="confetti-container">
          {confettiParticles.map((particle) => (
            <div
              key={particle.id}
              className="confetti"
              style={{
                transform: `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`,
                backgroundColor: particle.color
              }}
            />
          ))}
        </div>
      )}
      <div className="controls">
        <div className="control-group">
          <label htmlFor="num-tables">Number of Tables:</label>
          <input
            id="num-tables"
            type="number"
            min="1"
            max="10"
            value={numTables}
            onChange={(e) => setNumTables(parseInt(e.target.value) || 1)}
          />
        </div>
        <button onClick={cycleMatches} className="cycle-button">
          Next Matches
        </button>
        <div className={`matches-starting ${isPulsing ? 'show' : 'hide'}`}>
          Matches Starting
        </div>
        <div className="control-group match-range-group">
          <label htmlFor="current-match">Current Matches:</label>
          <input
            id="current-match"
            type="number"
            max={matches.length}
            value={startMatchInput}
            onChange={handleMatchIndexChange}
          />
          <span className="status-text">-</span>
          <input
            id="end-match"
            type="number"
            max={matches.length}
            value={endMatchInput}
            onChange={handleEndMatchChange}
          />
          <span className="status-text">of {matches.length}</span>
        </div>
      </div>

      <div className="display-area">
        <div className="active-tables">
          <h2>Active Tables</h2>
          <div className="tables-grid">
            {activeMatches.map((match, idx) => (
              <div
                key={match.number}
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === idx ? 'spin' : ''}`}
              >
                <div className="table-number">Table {idx + 1}</div>
                <div className="match-number">Match #{match.number}</div>
                <div className="team red-team">
                  <div className="team-name">{match.red}</div>
                </div>
                <div className="team blue-team">
                  <div className="team-name">{match.blue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="on-deck">
          <h2>On Deck</h2>
          <div className="on-deck-grid">
            {onDeckMatches.map((match, idx) => (
              <div
                key={match.number}
                className="on-deck-card horizontal"
              >
                <div className="match-number-small">Match #{match.number}</div>
                <div className="teams-horizontal">
                  <div className={`team-inline red-team ${jigglingOnDeckIndex === idx ? 'jiggle' : ''}`}>
                    <span className="team-label-small">RED:</span>
                    <span className="team-name-small">{match.red}</span>
                  </div>
                  <div className={`team-inline blue-team ${jigglingOnDeckIndex === idx ? 'jiggle' : ''}`}>
                    <span className="team-label-small">BLUE:</span>
                    <span className="team-name-small">{match.blue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
