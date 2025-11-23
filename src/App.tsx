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
  const [isEliminationMode, setIsEliminationMode] = useState<boolean>(false)
  const [eliminationMatch, setEliminationMatch] = useState<Match>({
    number: 0,
    r1: '',
    r2: '',
    b1: '',
    b2: '',
    g1: '',
    g2: ''
  })
  const [onDeckEliminationMatches, setOnDeckEliminationMatches] = useState<Match[]>(
    Array.from({ length: 6 }, (_, i) => ({
      number: i,
      r1: '',
      r2: '',
      b1: '',
      b2: '',
      g1: '',
      g2: ''
    }))
  )
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set())
  const [preservedMatches, setPreservedMatches] = useState<Match[]>([])
  const [preservedIndex, setPreservedIndex] = useState<number>(0)

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

  const handleSetEliminationMatch = () => {
    // Preserve current matches and index before entering elimination mode
    setPreservedMatches(matches)
    setPreservedIndex(currentIndex)

    setIsEliminationMode(true)
    setMatches([]) // Clear the deck
    setCurrentIndex(0)
    // Initialize with empty teams
    setEliminationMatch({
      number: 0,
      r1: '',
      r2: '',
      b1: '',
      b2: '',
      g1: '',
      g2: ''
    })
    setOnDeckEliminationMatches(
      Array.from({ length: 6 }, (_, i) => ({
        number: i,
        r1: '',
        r2: '',
        b1: '',
        b2: '',
        g1: '',
        g2: ''
      }))
    )
  }

  const handleEliminationTeamChange = (position: 'r1' | 'r2' | 'b1' | 'b2' | 'g1' | 'g2', teamNumber: string) => {
    setEliminationMatch(prev => ({
      ...prev,
      [position]: teamNumber
    }))
  }

  const handleOnDeckEliminationTeamChange = (matchIndex: number, position: 'r1' | 'r2' | 'b1' | 'b2' | 'g1' | 'g2', teamNumber: string) => {
    setOnDeckEliminationMatches(prev =>
      prev.map((match, idx) =>
        idx === matchIndex ? { ...match, [position]: teamNumber } : match
      )
    )
  }

  const handleExitEliminationMode = () => {
    // Restore the preserved matches and index
    setMatches(preservedMatches)
    setCurrentIndex(preservedIndex)

    setIsEliminationMode(false)
    setEliminationMatch({
      number: 0,
      r1: '',
      r2: '',
      b1: '',
      b2: '',
      g1: '',
      g2: ''
    })
    setOnDeckEliminationMatches(
      Array.from({ length: 6 }, (_, i) => ({
        number: i,
        r1: '',
        r2: '',
        b1: '',
        b2: '',
        g1: '',
        g2: ''
      }))
    )
    setHiddenTables(new Set())
  }

  const handleHideTable = (tableColor: string) => {
    setHiddenTables(prev => new Set(prev).add(tableColor))
  }

  const handleShowTable = (tableColor: string) => {
    setHiddenTables(prev => {
      const newSet = new Set(prev)
      newSet.delete(tableColor)
      return newSet
    })
  }

  const handleNextEliminationMatch = () => {
    // Copy first on-deck match to current match
    setEliminationMatch(onDeckEliminationMatches[0])
    // Shift all on-deck matches up and add a new empty one at the end
    setOnDeckEliminationMatches(prev => [
      ...prev.slice(1),
      {
        number: 0,
        r1: '',
        r2: '',
        b1: '',
        b2: '',
        g1: '',
        g2: ''
      }
    ])
    // Trigger pulsing animation
    if (pulseEnabled) {
      setIsPulsing(true)
      setTimeout(() => {
        setIsPulsing(false)
      }, pulseDuration * 1000)
    }
  }

  // Get sorted list of all team numbers for dropdown
  const teamNumbersList = Array.from(teamNames.keys()).sort((a, b) => parseInt(a) - parseInt(b))

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
    // Enable animations in both regular mode (when matches exist) and elimination mode
    if ((matches.length === 0 && !isEliminationMode) || tableSpinInterval <= 0 || !tableSpinEnabled) return

    const spinAnimation = TableSpinAnimation.createSequentialSpin(
      3, // Always 3 tables
      isEliminationMode ? 1 : matches.length, // Use 1 match in elimination mode
      isEliminationMode ? 0 : currentIndex,
      setSpinningTableIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(spinAnimation, tableSpinInterval, tableSpinEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, tableSpinInterval, currentIndex, isPulsing, tableSpinEnabled, isEliminationMode])

  // ======= On-Deck Animations =======
  useEffect(() => {
    // Enable animations in both regular mode (when matches exist) and elimination mode
    if ((matches.length === 0 && !isEliminationMode) || onDeckJiggleInterval <= 0 || !onDeckJiggleEnabled) return

    const jiggleAnimation = OnDeckJiggleAnimation.createSequentialJiggle(
      isEliminationMode ? 6 : matches.length, // Use 6 on-deck matches in elimination mode
      isEliminationMode ? -1 : currentIndex, // Use -1 as current index in elimination mode (so all 6 on-deck are animated)
      setJigglingOnDeckIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(jiggleAnimation, onDeckJiggleInterval, onDeckJiggleEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, onDeckJiggleInterval, currentIndex, onDeckJiggleEnabled, isPulsing, isEliminationMode])

  const currentMatch = matches[currentIndex]
  // Show all remaining matches as on-deck (will be limited by CSS overflow)
  const onDeckMatches = matches.slice(currentIndex + 1)

  if (matches.length === 0 && !isEliminationMode) {
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
        {!isEliminationMode ? (
          currentIndex === matches.length - 1 && matches.length > 0 ? (
            <button onClick={handleSetEliminationMatch} className="elimination-button">
              Go To Eliminations
            </button>
          ) : (
            <button onClick={cycleMatches} className="cycle-button">
              Next Match
            </button>
          )
        ) : (
          <>
            <button onClick={handleNextEliminationMatch} className="cycle-button">
              Next Match
            </button>
            <button onClick={handleExitEliminationMode} className="cycle-button">
              Exit Eliminations
            </button>
          </>
        )}
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
          <h2>{isEliminationMode ? 'Elimination Match' : 'Current Match'}</h2>
          {(currentMatch || isEliminationMode) && (
            <div className={`tables-grid ${isEliminationMode ? 'elimination-mode' : ''}`}>
              {/* Red Table */}
              {!hiddenTables.has('red') && (
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 0 ? 'spin' : ''}`}
              >
                {isEliminationMode && (
                  <button className="hide-table-button" onClick={() => handleHideTable('red')} title="Hide Red Table">
                    ×
                  </button>
                )}
                <div className="table-number table-red">R</div>
                <div className="match-number">{isEliminationMode ? 'Elimination Match' : `Match #${currentMatch?.number}`}</div>
                <div className="team team-red team-1">
                  {isEliminationMode ? (
                    <div className="team-dropdown-container">
                      <span className="team-label-dropdown">R1:</span>
                      <select
                        className="team-dropdown"
                        value={eliminationMatch.r1}
                        onChange={(e) => handleEliminationTeamChange('r1', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teamNumbersList.map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label="R1">{getTeamDisplay(currentMatch!.r1)}</div>
                  )}
                </div>
                <div className="team team-red team-2">
                  {isEliminationMode ? (
                    <div className="team-dropdown-container">
                      <span className="team-label-dropdown">R2:</span>
                      <select
                        className="team-dropdown"
                        value={eliminationMatch.r2}
                        onChange={(e) => handleEliminationTeamChange('r2', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teamNumbersList.map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label="R2">{getTeamDisplay(currentMatch!.r2)}</div>
                  )}
                </div>
              </div>
              )}

              {/* Green Table */}
              {!hiddenTables.has('green') && (
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 1 ? 'spin' : ''}`}
              >
                {isEliminationMode && (
                  <button className="hide-table-button" onClick={() => handleHideTable('green')} title="Hide Green Table">
                    ×
                  </button>
                )}
                <div className="table-number table-green">G</div>
                <div className="match-number">{isEliminationMode ? 'Elimination Match' : `Match #${currentMatch?.number}`}</div>
                <div className="team team-green team-1">
                  {isEliminationMode ? (
                    <div className="team-dropdown-container">
                      <span className="team-label-dropdown">G1:</span>
                      <select
                        className="team-dropdown"
                        value={eliminationMatch.g1}
                        onChange={(e) => handleEliminationTeamChange('g1', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teamNumbersList.map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label="G1">{getTeamDisplay(currentMatch!.g1)}</div>
                  )}
                </div>
                <div className="team team-green team-2">
                  {isEliminationMode ? (
                    <div className="team-dropdown-container">
                      <span className="team-label-dropdown">G2:</span>
                      <select
                        className="team-dropdown"
                        value={eliminationMatch.g2}
                        onChange={(e) => handleEliminationTeamChange('g2', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teamNumbersList.map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label="G2">{getTeamDisplay(currentMatch!.g2)}</div>
                  )}
                </div>
              </div>
              )}

              {/* Blue Table */}
              {!hiddenTables.has('blue') && (
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 2 ? 'spin' : ''}`}
              >
                {isEliminationMode && (
                  <button className="hide-table-button" onClick={() => handleHideTable('blue')} title="Hide Blue Table">
                    ×
                  </button>
                )}
                <div className="table-number table-blue">B</div>
                <div className="match-number">{isEliminationMode ? 'Elimination Match' : `Match #${currentMatch?.number}`}</div>
                <div className="team team-blue team-1">
                  {isEliminationMode ? (
                    <div className="team-dropdown-container">
                      <span className="team-label-dropdown">B1:</span>
                      <select
                        className="team-dropdown"
                        value={eliminationMatch.b1}
                        onChange={(e) => handleEliminationTeamChange('b1', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teamNumbersList.map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label="B1">{getTeamDisplay(currentMatch!.b1)}</div>
                  )}
                </div>
                <div className="team team-blue team-2">
                  {isEliminationMode ? (
                    <div className="team-dropdown-container">
                      <span className="team-label-dropdown">B2:</span>
                      <select
                        className="team-dropdown"
                        value={eliminationMatch.b2}
                        onChange={(e) => handleEliminationTeamChange('b2', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teamNumbersList.map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label="B2">{getTeamDisplay(currentMatch!.b2)}</div>
                  )}
                </div>
              </div>
              )}
            </div>
          )}

          {/* Show hidden tables buttons */}
          {isEliminationMode && hiddenTables.size > 0 && (
            <div className="show-tables-panel">
              <h3>Show Tables:</h3>
              {hiddenTables.has('red') && (
                <button className="show-table-button table-red" onClick={() => handleShowTable('red')}>
                  Show Red
                </button>
              )}
              {hiddenTables.has('green') && (
                <button className="show-table-button table-green" onClick={() => handleShowTable('green')}>
                  Show Green
                </button>
              )}
              {hiddenTables.has('blue') && (
                <button className="show-table-button table-blue" onClick={() => handleShowTable('blue')}>
                  Show Blue
                </button>
              )}
            </div>
          )}
        </div>

        <div className="on-deck">
          <h2>On Deck</h2>
          <div className="on-deck-list">
            {isEliminationMode ? (
              onDeckEliminationMatches.map((match, matchIndex) => (
              <div key={matchIndex} className="on-deck-card-compact">
                <div className="match-number-ondeck">On Deck {matchIndex + 1}:</div>
                <div className="team-inline team-inline-red team-inline-1">
                  <span className="team-label-small">R1:</span>
                  <select
                    className="team-dropdown-small"
                    value={match.r1}
                    onChange={(e) => handleOnDeckEliminationTeamChange(matchIndex, 'r1', e.target.value)}
                  >
                    <option value="">Select</option>
                    {teamNumbersList.map(num => (
                      <option key={num} value={num}>
                        {getTeamDisplay(num)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="team-inline team-inline-red team-inline-2">
                  <span className="team-label-small">R2:</span>
                  <select
                    className="team-dropdown-small"
                    value={match.r2}
                    onChange={(e) => handleOnDeckEliminationTeamChange(matchIndex, 'r2', e.target.value)}
                  >
                    <option value="">Select</option>
                    {teamNumbersList.map(num => (
                      <option key={num} value={num}>
                        {getTeamDisplay(num)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="team-inline team-inline-green team-inline-1">
                  <span className="team-label-small">G1:</span>
                  <select
                    className="team-dropdown-small"
                    value={match.g1}
                    onChange={(e) => handleOnDeckEliminationTeamChange(matchIndex, 'g1', e.target.value)}
                  >
                    <option value="">Select</option>
                    {teamNumbersList.map(num => (
                      <option key={num} value={num}>
                        {getTeamDisplay(num)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="team-inline team-inline-green team-inline-2">
                  <span className="team-label-small">G2:</span>
                  <select
                    className="team-dropdown-small"
                    value={match.g2}
                    onChange={(e) => handleOnDeckEliminationTeamChange(matchIndex, 'g2', e.target.value)}
                  >
                    <option value="">Select</option>
                    {teamNumbersList.map(num => (
                      <option key={num} value={num}>
                        {getTeamDisplay(num)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="team-inline team-inline-blue team-inline-1">
                  <span className="team-label-small">B1:</span>
                  <select
                    className="team-dropdown-small"
                    value={match.b1}
                    onChange={(e) => handleOnDeckEliminationTeamChange(matchIndex, 'b1', e.target.value)}
                  >
                    <option value="">Select</option>
                    {teamNumbersList.map(num => (
                      <option key={num} value={num}>
                        {getTeamDisplay(num)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="team-inline team-inline-blue team-inline-2">
                  <span className="team-label-small">B2:</span>
                  <select
                    className="team-dropdown-small"
                    value={match.b2}
                    onChange={(e) => handleOnDeckEliminationTeamChange(matchIndex, 'b2', e.target.value)}
                  >
                    <option value="">Select</option>
                    {teamNumbersList.map(num => (
                      <option key={num} value={num}>
                        {getTeamDisplay(num)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              ))
            ) : (
              onDeckMatches.map((match, index) => (
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
            )))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
