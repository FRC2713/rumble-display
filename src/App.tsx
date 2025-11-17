import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import {
  AnimationScheduler,
  TableSpinAnimation,
  OnDeckJiggleAnimation,
  ConfettiAnimation,
  type ConfettiParticle
} from './animations'
import type { Match } from './types/Match'
import { CsvLoader } from './services/CsvLoader'
import { TeamLoader } from './services/TeamLoader'
import { TableEditor } from './components/TableEditor'
import { TeamEditor } from './components/TeamEditor'

function App() {
  const [matches, setMatches] = useState<Match[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [startMatchInput, setStartMatchInput] = useState<string>('')
  const [isPulsing, setIsPulsing] = useState<boolean>(false)
  const [spinningTableIndex, setSpinningTableIndex] = useState<number>(-1)
  const [jigglingOnDeckIndex, setJigglingOnDeckIndex] = useState<number>(-1)
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef<number>(0)

  const [tableSpinInterval, setTableSpinInterval] = useState<number>(60)
  const [onDeckJiggleInterval, setOnDeckJiggleInterval] = useState<number>(45)
  const [pulseDuration, setPulseDuration] = useState<number>(10)
  const [tableSpinEnabled, setTableSpinEnabled] = useState<boolean>(true)
  const [onDeckJiggleEnabled, setOnDeckJiggleEnabled] = useState<boolean>(true)
  const [pulseEnabled, setPulseEnabled] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showTableEditor, setShowTableEditor] = useState<boolean>(false)
  const [showTeamEditor, setShowTeamEditor] = useState<boolean>(false)
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map())
  const [defaultMatches, setDefaultMatches] = useState<Match[]>([])
  const [useTeamNames, setUseTeamNames] = useState<boolean>(true)

  // ======= Data Loading =======
  // Load default team names and matches on mount
  useEffect(() => {
    const loadDefaults = async () => {
      const teams = await TeamLoader.loadDefaultTeams()
      setTeamNames(teams)

      const matches = await CsvLoader.loadDefaultMatches()
      setDefaultMatches(matches)
    }
    loadDefaults()
  }, [])

  const handleTableEditorSave = (newMatches: Match[]) => {
    setMatches(newMatches)
    setCurrentIndex(0)
    setShowTableEditor(false)
  }

  const handleTableEditorCancel = () => {
    setShowTableEditor(false)
  }

  const handleLoadDefaultMatches = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const defaultMatches = await CsvLoader.loadDefaultMatches()
      setMatches(defaultMatches)
      setCurrentIndex(0)
    } catch (error) {
      setLoadError('Failed to load default matches')
      console.error('Error loading default matches:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeamEditorSave = (newTeams: Map<string, string>) => {
    setTeamNames(newTeams)
    setShowTeamEditor(false)
  }

  const handleTeamEditorCancel = () => {
    setShowTeamEditor(false)
  }

  const getTeamDisplay = (teamNumber: string): string => {
    if (useTeamNames) {
      return TeamLoader.getTeamDisplay(teamNumber, teamNames)
    }
    return `#${teamNumber}`
  }

  // ======= Current Match Managing =======
  const cycleMatches = () => {
    if (currentIndex + 1 < matches.length) {
      setCurrentIndex(currentIndex + 1)
      if (pulseEnabled) {
        setIsPulsing(true)
        setTimeout(() => {
          setIsPulsing(false)
        }, pulseDuration * 1000)
      }
    } else {
      // All matches complete - trigger combined confetti animation
      createCombinedConfetti()
      lastTimeRef.current = 0
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
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

  // Sync input values with currentIndex
  useEffect(() => {
    setStartMatchInput(String(currentIndex + 1))
  }, [currentIndex])

  // ======= Confetti =======
  const createConfetti = useCallback(() => {
    const particles = ConfettiAnimation.createConfetti()
    setConfettiParticles(particles)
  }, [])

  const createCombinedConfetti = useCallback(() => {
    const particles = ConfettiAnimation.createCombinedConfetti()
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
      3, // Always 3 tables
      matches.length,
      currentIndex,
      setSpinningTableIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(spinAnimation, tableSpinInterval, tableSpinEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, tableSpinInterval, currentIndex, isPulsing, tableSpinEnabled])

  // ======= On-Deck Animations =======
  useEffect(() => {
    if (matches.length === 0 || onDeckJiggleInterval <= 0 || !onDeckJiggleEnabled) return

    const jiggleAnimation = OnDeckJiggleAnimation.createSequentialJiggle(
      matches.length,
      currentIndex,
      setJigglingOnDeckIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(jiggleAnimation, onDeckJiggleInterval, onDeckJiggleEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, onDeckJiggleInterval, currentIndex, onDeckJiggleEnabled, isPulsing])

  const currentMatch = matches[currentIndex]
  // Show all remaining matches as on-deck (will be limited by CSS overflow)
  const onDeckMatches = matches.slice(currentIndex + 1)

  if (matches.length === 0) {
    return (
      <div className="upload-container">
        <h1>Event Match Display</h1>
        <div className="upload-section">
          {isLoading ? (
            <div className="loading-message">Loading matches...</div>
          ) : showTableEditor ? (
            <TableEditor
              initialMatches={defaultMatches}
              onSave={handleTableEditorSave}
              onCancel={handleTableEditorCancel}
            />
          ) : showTeamEditor ? (
            <TeamEditor
              initialTeams={teamNames}
              onSave={handleTeamEditorSave}
              onCancel={handleTeamEditorCancel}
            />
          ) : (
            <>
              {loadError && <div className="error-message">{loadError}</div>}

              <div className="data-source-options">
                <div className="data-source-option">
                  <h3>Set Match Schedule & Start</h3>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center'}}>
                    <button
                      onClick={handleLoadDefaultMatches}
                      className="upload-label"
                      style={{border: 'none', cursor: 'pointer'}}
                    >
                      Default<br/>(Rumble 2025)
                    </button>
                    <span style={{color: '#999', fontSize: '1.2rem', fontWeight: 'bold'}}>Or</span>
                    <button
                      onClick={() => setShowTableEditor(true)}
                      className="upload-label"
                      style={{border: 'none', cursor: 'pointer'}}
                    >
                      Open Table Editor
                    </button>
                  </div>
                  <p className="instructions">
                    Load default matches or enter manually
                  </p>
                </div>

                <div className="data-source-option" style={{padding: '1.5rem'}}>
                  <h3 style={{fontSize: '1rem', marginBottom: '0.75rem'}}>Team Names</h3>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center'}}>
                    <button
                      onClick={() => setShowTeamEditor(true)}
                      className="upload-label"
                      style={{border: 'none', cursor: 'pointer', padding: '0.75rem 1.5rem', fontSize: '1rem'}}
                    >
                      Open Table Editor
                    </button>
                  </div>
                  <p className="instructions" style={{fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0'}}>
                    Default (Rumble 2025) team list is loaded.
                  </p>
                </div>
              </div>
            </>
          )}

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
                    min="20"
                    max="600"
                    value={tableSpinInterval}
                    onChange={(e) => setTableSpinInterval(parseInt(e.target.value))}
                    className="config-slider"
                    disabled={!tableSpinEnabled}
                  />
                  <span className="slider-label">Infrequently</span>
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
                    min="20"
                    max="600"
                    value={onDeckJiggleInterval}
                    onChange={(e) => setOnDeckJiggleInterval(parseInt(e.target.value))}
                    className="config-slider"
                    disabled={!onDeckJiggleEnabled}
                  />
                  <span className="slider-label">Infrequently</span>
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
              <div className="slider-row" style={{justifyContent: 'center', gap: '1rem'}}>
                <label htmlFor="pulse-duration">Match Start Animation Duration (seconds):</label>
                <input
                  id="pulse-duration"
                  type="number"
                  min="0"
                  value={pulseDuration}
                  onChange={(e) => setPulseDuration(parseInt(e.target.value) || 0)}
                  className="config-input"
                  disabled={!pulseEnabled}
                  style={{margin: 0}}
                />
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={pulseEnabled}
                    onChange={(e) => setPulseEnabled(e.target.checked)}
                    className="config-checkbox"
                  />
                  <span className="checkbox-label">Enable</span>
                </label>
              </div>
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
              className={`confetti ${particle.shape === 'lego' ? 'confetti-lego' : ''}`}
              style={{
                transform: `translate(${particle.x}px, ${particle.y}px) rotate(${particle.rotation}deg)`,
                backgroundColor: particle.color
              }}
            />
          ))}
        </div>
      )}
      <div className="controls">
        <button onClick={cycleMatches} className="cycle-button">
          Next Match
        </button>
        <div className={`matches-starting ${isPulsing ? 'show' : 'hide'}`}>
          New Matches: Begin Setup
        </div>
        <div className="control-group rocker-switch-group">
          <label className="rocker-switch">
            <input
              type="checkbox"
              checked={useTeamNames}
              onChange={(e) => setUseTeamNames(e.target.checked)}
            />
            <span className="rocker-slider">
              <span className="rocker-label rocker-label-left">Numbers</span>
              <span className="rocker-label rocker-label-right">Names</span>
            </span>
          </label>
        </div>
        <div className="control-group match-range-group">
          <label htmlFor="current-match">Current Match:</label>
          <input
            id="current-match"
            type="number"
            min="1"
            max={matches.length}
            value={startMatchInput}
            onChange={handleMatchIndexChange}
          />
          <span className="status-text">of {matches.length}</span>
        </div>
      </div>

      <div className="display-area">
        <div className="active-tables">
          <h2>Current Match</h2>
          {currentMatch && (
            <div className="tables-grid">
              {/* Red Table */}
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 0 ? 'spin' : ''}`}
              >
                <div className="table-number table-red">R</div>
                <div className="match-number">Match #{currentMatch.number}</div>
                <div className="team team-red team-1">
                  <div className="team-name" data-label="R1">{getTeamDisplay(currentMatch.r1)}</div>
                </div>
                <div className="team team-red team-2">
                  <div className="team-name" data-label="R2">{getTeamDisplay(currentMatch.r2)}</div>
                </div>
              </div>

              {/* Green Table */}
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 1 ? 'spin' : ''}`}
              >
                <div className="table-number table-green">G</div>
                <div className="match-number">Match #{currentMatch.number}</div>
                <div className="team team-green team-1">
                  <div className="team-name" data-label="G1">{getTeamDisplay(currentMatch.g1)}</div>
                </div>
                <div className="team team-green team-2">
                  <div className="team-name" data-label="G2">{getTeamDisplay(currentMatch.g2)}</div>
                </div>
              </div>

              {/* Blue Table */}
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 2 ? 'spin' : ''}`}
              >
                <div className="table-number table-blue">B</div>
                <div className="match-number">Match #{currentMatch.number}</div>
                <div className="team team-blue team-1">
                  <div className="team-name" data-label="B1">{getTeamDisplay(currentMatch.b1)}</div>
                </div>
                <div className="team team-blue team-2">
                  <div className="team-name" data-label="B2">{getTeamDisplay(currentMatch.b2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="on-deck">
          <h2>On Deck</h2>
          <div className="on-deck-list">
            {onDeckMatches.map((match, index) => (
              <div key={match.number} className={`on-deck-card-compact ${jigglingOnDeckIndex === index ? 'jiggle' : ''}`}>
                <div className="match-number-ondeck">Match #{match.number}:</div>
                <div className="team-inline team-inline-red team-inline-1">
                  <span className="team-label-small">R1:</span>
                  <span className="team-name-small">{getTeamDisplay(match.r1)}</span>
                </div>
                <div className="team-inline team-inline-red team-inline-2">
                  <span className="team-label-small">R2:</span>
                  <span className="team-name-small">{getTeamDisplay(match.r2)}</span>
                </div>
                <div className="team-inline team-inline-green team-inline-1">
                  <span className="team-label-small">G1:</span>
                  <span className="team-name-small">{getTeamDisplay(match.g1)}</span>
                </div>
                <div className="team-inline team-inline-green team-inline-2">
                  <span className="team-label-small">G2:</span>
                  <span className="team-name-small">{getTeamDisplay(match.g2)}</span>
                </div>
                <div className="team-inline team-inline-blue team-inline-1">
                  <span className="team-label-small">B1:</span>
                  <span className="team-name-small">{getTeamDisplay(match.b1)}</span>
                </div>
                <div className="team-inline team-inline-blue team-inline-2">
                  <span className="team-label-small">B2:</span>
                  <span className="team-name-small">{getTeamDisplay(match.b2)}</span>
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
