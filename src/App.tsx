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
import { RankingsLoader } from './services/RankingsLoader'
import { EliminationMatchGenerator } from './services/EliminationMatchGenerator'
import { TableEditor } from './components/TableEditor'
import { TeamEditor } from './components/TeamEditor'
import { RankingsTable, type TeamRanking } from './components/RankingsTable'

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

  const [tableSpinInterval, setTableSpinInterval] = useState<number>(20)
  const [onDeckJiggleInterval, setOnDeckJiggleInterval] = useState<number>(20)
  const [pulseDuration, setPulseDuration] = useState<number>(3)
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
  const [eliminationPhase, setEliminationPhase] = useState<'setup' | 'matches' | 'finals'>('setup')
  const [rankings, setRankings] = useState<TeamRanking[]>(
    Array.from({ length: 30 }, (_, i) => ({
      rank: i + 1,
      teamName: '',
      teamNumber: ''
    }))
  )
  const [eliminationMatches, setEliminationMatches] = useState<Match[]>([])
  const [eliminationCurrentIndex, setEliminationCurrentIndex] = useState<number>(0)
  const [finalsMatches, setFinalsMatches] = useState<Match[]>(
    EliminationMatchGenerator.createFinalsMatches()
  )
  const [finalsCurrentIndex, setFinalsCurrentIndex] = useState<number>(0)
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set())
  const [preservedMatches, setPreservedMatches] = useState<Match[]>([])
  const [preservedIndex, setPreservedIndex] = useState<number>(0)
  const [isTipVisible, setIsTipVisible] = useState<boolean>(true)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false)

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
    // Check if this looks like a team number (all digits)
    const isNumeric = /^\d+$/.test(teamNumber)

    if (useTeamNames) {
      // If it's a numeric value, try to get the team name from the map
      if (isNumeric) {
        return TeamLoader.getTeamDisplay(teamNumber, teamNames)
      }
      // Otherwise it's already a team name, display as-is
      return teamNumber
    }

    // In number mode, only add # prefix if it's actually a number
    if (isNumeric) {
      return `#${teamNumber}`
    }
    // If it's a team name, display as-is
    return teamNumber
  }

  // Get sorted team numbers for dropdowns
  const getSortedTeamNumbers = (): string[] => {
    const teamNumbers = Array.from(teamNames.keys())

    if (useTeamNames) {
      // Sort alphabetically by team name
      return teamNumbers.sort((a, b) => {
        const nameA = teamNames.get(a) || a
        const nameB = teamNames.get(b) || b
        return nameA.localeCompare(nameB)
      })
    } else {
      // Sort numerically by team number
      return teamNumbers.sort((a, b) => parseInt(a) - parseInt(b))
    }
  }

  const handleSetEliminationMode = () => {
    // Preserve current matches and index before entering elimination mode
    setPreservedMatches(matches)
    setPreservedIndex(currentIndex)

    setIsEliminationMode(true)
    setEliminationPhase('setup')
    setMatches([]) // Clear the deck
    setCurrentIndex(0)
  }

  const handleStartEliminationMatches = () => {
    // Generate elimination matches from rankings
    const generatedMatches = EliminationMatchGenerator.generateMatches(rankings)
    setEliminationMatches(generatedMatches)
    setEliminationCurrentIndex(0)
    setEliminationPhase('matches')
  }

  const handleStartFinalsMatches = () => {
    setEliminationPhase('finals')
    setFinalsCurrentIndex(0)
  }

  const handleFinalsTeamChange = (matchIndex: number, position: 'r1' | 'r2' | 'g1' | 'g2' | 'b1' | 'b2', teamNumber: string) => {
    const newMatches = finalsMatches.map((match, idx) =>
      idx === matchIndex ? { ...match, [position]: teamNumber } : match
    )
    setFinalsMatches(newMatches)
  }

  const handleExitEliminationMode = () => {
    // If in finals mode, go back to the last elimination match
    if (eliminationPhase === 'finals') {
      setEliminationPhase('matches')
      setEliminationCurrentIndex(eliminationMatches.length - 1)
      setHiddenTables(new Set()) // Clear hidden tables when going back
      return
    }

    // Otherwise, exit elimination mode completely
    // Restore the preserved matches and index
    setMatches(preservedMatches)
    setCurrentIndex(preservedIndex)

    setIsEliminationMode(false)
    setEliminationPhase('setup')
    setEliminationMatches([])
    setEliminationCurrentIndex(0)
    setFinalsMatches(EliminationMatchGenerator.createFinalsMatches())
    setFinalsCurrentIndex(0)
    setHiddenTables(new Set())
  }

  const handleLoadRankingsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const loadedRankings = await RankingsLoader.loadFromFile(file)
      setRankings(loadedRankings)
    } catch (error) {
      console.error('Error loading rankings CSV:', error)
      setLoadError('Failed to load rankings CSV')
    }
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
    if (eliminationPhase === 'matches') {
      // Move to next elimination match
      if (eliminationCurrentIndex + 1 < eliminationMatches.length) {
        setEliminationCurrentIndex(eliminationCurrentIndex + 1)
      } else {
        // All elimination matches complete, move to finals
        handleStartFinalsMatches()
      }
    } else if (eliminationPhase === 'finals') {
      // Move to next finals match
      if (finalsCurrentIndex + 1 < finalsMatches.length) {
        setFinalsCurrentIndex(finalsCurrentIndex + 1)
      }
    }

    // Trigger pulsing animation
    if (pulseEnabled) {
      setIsPulsing(true)
      setTimeout(() => {
        setIsPulsing(false)
      }, pulseDuration * 1000)
    }
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
    if (isEliminationMode && eliminationPhase === 'matches') {
      // Handle elimination matches
      if (!isNaN(value) && value >= 1 && value <= eliminationMatches.length) {
        setEliminationCurrentIndex(value - 1) // Convert to 0-based index
      }
    } else if (isEliminationMode && eliminationPhase === 'finals') {
      // Handle finals matches
      if (!isNaN(value) && value >= 1 && value <= finalsMatches.length) {
        setFinalsCurrentIndex(value - 1) // Convert to 0-based index
      }
    } else if (!isEliminationMode) {
      // Handle regular matches
      if (!isNaN(value) && value >= 1 && value <= matches.length) {
        setCurrentIndex(value - 1) // Convert to 0-based index
      }
    }
  }

  // Sync input values with currentIndex or eliminationCurrentIndex
  useEffect(() => {
    if (isEliminationMode && eliminationPhase === 'matches') {
      setStartMatchInput(String(eliminationCurrentIndex + 1))
    } else if (isEliminationMode && eliminationPhase === 'finals') {
      setStartMatchInput(String(finalsCurrentIndex + 1))
    } else if (!isEliminationMode) {
      setStartMatchInput(String(currentIndex + 1))
    }
  }, [currentIndex, eliminationCurrentIndex, finalsCurrentIndex, isEliminationMode, eliminationPhase])

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
        // Use combined confetti (both sprinkle and lego) in elimination/finals mode
        if (isEliminationMode) {
          createCombinedConfetti()
        } else {
          createConfetti()
        }
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
  }, [animate, createConfetti, createCombinedConfetti, isEliminationMode])

  useEffect(() => {
    if (confettiParticles.length === 0 && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
  }, [confettiParticles])

  // ======= Table Animations =======
  useEffect(() => {
    // Enable animations in both regular mode (when matches exist) and elimination mode
    const shouldAnimate = isEliminationMode
      ? eliminationPhase !== 'setup'
      : matches.length > 0

    if (!shouldAnimate || tableSpinInterval <= 0 || !tableSpinEnabled) return

    const spinAnimation = TableSpinAnimation.createSequentialSpin(
      setSpinningTableIndex,
      isPulsing,
      hiddenTables
    )

    const scheduler = new AnimationScheduler(spinAnimation, tableSpinInterval, tableSpinEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, eliminationMatches.length, finalsMatches.length, tableSpinInterval, currentIndex, eliminationCurrentIndex, finalsCurrentIndex, isPulsing, tableSpinEnabled, isEliminationMode, eliminationPhase, hiddenTables])

  // ======= On-Deck Animations =======
  useEffect(() => {
    // Enable animations in both regular mode (when matches exist) and elimination mode
    const shouldAnimate = isEliminationMode
      ? eliminationPhase !== 'setup'
      : matches.length > 0

    if (!shouldAnimate || onDeckJiggleInterval <= 0 || !onDeckJiggleEnabled) return

    const totalMatches = isEliminationMode
      ? (eliminationPhase === 'matches' ? eliminationMatches.length : finalsMatches.length)
      : matches.length

    const currentIdx = isEliminationMode
      ? (eliminationPhase === 'matches' ? eliminationCurrentIndex : finalsCurrentIndex)
      : currentIndex

    const jiggleAnimation = OnDeckJiggleAnimation.createSequentialJiggle(
      totalMatches,
      currentIdx,
      setJigglingOnDeckIndex,
      isPulsing
    )

    const scheduler = new AnimationScheduler(jiggleAnimation, onDeckJiggleInterval, onDeckJiggleEnabled)
    scheduler.start()

    return () => scheduler.stop()
  }, [matches.length, eliminationMatches.length, finalsMatches.length, onDeckJiggleInterval, currentIndex, eliminationCurrentIndex, finalsCurrentIndex, onDeckJiggleEnabled, isPulsing, isEliminationMode, eliminationPhase])

  const currentMatch = matches[currentIndex]
  // Show all remaining matches as on-deck (will be limited by CSS overflow)
  const onDeckMatches = matches.slice(currentIndex + 1)

  // Determine which match to display in elimination mode
  const displayMatch = isEliminationMode
    ? (eliminationPhase === 'matches'
      ? eliminationMatches[eliminationCurrentIndex]
      : eliminationPhase === 'finals'
      ? finalsMatches[finalsCurrentIndex]
      : null)
    : currentMatch

  // Determine on-deck matches for elimination mode
  const eliminationOnDeckMatches = eliminationPhase === 'matches'
    ? eliminationMatches.slice(eliminationCurrentIndex + 1)
    : eliminationPhase === 'finals'
    ? finalsMatches.slice(finalsCurrentIndex + 1)
    : []

  if (matches.length === 0 && !isEliminationMode) {
    return (
      <div className="upload-container">
        <h1>FLL Qualifier Display</h1>
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

              {/* Simplified initial view */}
              <div className="data-source-options">
                <div className="data-source-option">
                  <h3>Start Event</h3>
                  <div style={{display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center'}}>
                    <button
                      onClick={handleLoadDefaultMatches}
                      className="upload-label"
                      style={{border: 'none', cursor: 'pointer'}}
                    >
                      Rumble 2025
                    </button>
                  </div>
                  <p className="instructions">
                    Select a pre-loaded prelim match schedule and team list.
                  </p>
                </div>

                {/* Advanced Options Toggle */}
                <div style={{textAlign: 'center', marginTop: '1rem'}}>
                  <button
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4a9eff',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      textDecoration: 'underline',
                      padding: '0.5rem'
                    }}
                  >
                    {showAdvancedOptions ? 'Hide Advanced Options' : 'Advanced Options'}
                  </button>
                </div>

                {/* Advanced Options - hidden by default */}
                {showAdvancedOptions && (
                  <>
                    <div className="data-source-option" style={{marginTop: '1rem', padding: '1.5rem'}}>
                      <h3 style={{fontSize: '1rem', marginBottom: '0.75rem'}}>Custom Match Schedule</h3>
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center'}}>
                        <button
                          onClick={() => setShowTableEditor(true)}
                          className="upload-label"
                          style={{border: 'none', cursor: 'pointer', padding: '0.75rem 1.5rem', fontSize: '1rem'}}
                        >
                          Open Table Editor
                        </button>
                      </div>
                      <p className="instructions" style={{fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0'}}>
                        Enter custom match schedule manually
                      </p>
                    </div>

                    <div className="data-source-option" style={{padding: '1.5rem'}}>
                      <h3 style={{fontSize: '1rem', marginBottom: '0.75rem'}}>Custom Team Names</h3>
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center'}}>
                        <button
                          onClick={() => setShowTeamEditor(true)}
                          className="upload-label"
                          style={{border: 'none', cursor: 'pointer', padding: '0.75rem 1.5rem', fontSize: '1rem'}}
                        >
                          Open Team Editor
                        </button>
                      </div>
                      <p className="instructions" style={{fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0'}}>
                        Enter custom team names and numbers.
                      </p>
                    </div>

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
                    min="10"
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
                    min="10"
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <p className="instructions">
          Once you start an event, you can use the buttons on the top bar to navigate preliminary and elimination matches.
        </p>
        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          opacity: 0.6
        }}>
          <a
            href="https://github.com/FRC2713/rumble-display"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#999',
              textDecoration: 'none',
              fontSize: '0.85rem',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View on GitHub
          </a>
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
            <>
              <div className="button-group">
                <button onClick={handleSetEliminationMode} className="elimination-button secondary-button">
                  Go To Eliminations
                </button>
                <button onClick={() => { setMatches([]); setCurrentIndex(0); }} className="back-button secondary-button">
                  Back to Setup
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={cycleMatches} className="cycle-button">
                Next Match
              </button>
              <div className="button-divider"></div>
              <div className="button-group">
                <button onClick={handleSetEliminationMode} className="elimination-button secondary-button">
                  Skip to Eliminations
                </button>
                <button onClick={() => { setMatches([]); setCurrentIndex(0); }} className="back-button secondary-button">
                  Back to Setup
                </button>
              </div>
            </>
          )
        ) : eliminationPhase === 'setup' ? (
          <>
            <button
              onClick={handleStartEliminationMatches}
              className="cycle-button"
              disabled={!rankings.every(r => (r.teamName && r.teamName.trim() !== '') || (r.teamNumber && r.teamNumber.trim() !== ''))}
              style={{
                opacity: !rankings.every(r => (r.teamName && r.teamName.trim() !== '') || (r.teamNumber && r.teamNumber.trim() !== '')) ? 0.5 : 1,
                cursor: !rankings.every(r => (r.teamName && r.teamName.trim() !== '') || (r.teamNumber && r.teamNumber.trim() !== '')) ? 'not-allowed' : 'pointer'
              }}
            >
              Start Elimination Matches
            </button>
            {!rankings.every(r => (r.teamName && r.teamName.trim() !== '') || (r.teamNumber && r.teamNumber.trim() !== '')) && (
              <div style={{
                fontSize: '0.85rem',
                color: '#ff9999',
                marginTop: '0.5rem',
                textAlign: 'center'
              }}>
                Please fill in all {rankings.length} teams in the rankings table ({rankings.filter(r => (r.teamName && r.teamName.trim() !== '') || (r.teamNumber && r.teamNumber.trim() !== '')).length}/{rankings.length} completed)
              </div>
            )}
            <div className="button-divider"></div>
            <button onClick={handleExitEliminationMode} className="back-button secondary-button">
              Back to Prelims
            </button>
          </>
        ) : eliminationPhase === 'finals' ? (
          <>
            <button onClick={() => { setEliminationPhase('matches'); setFinalsCurrentIndex(0); }} className="back-button">
              Back to Elims
            </button>
          </>
        ) : (
          <>
            {eliminationCurrentIndex === eliminationMatches.length - 1 ? (
              <div className="button-group">
                <button onClick={handleNextEliminationMatch} className="elimination-button secondary-button">
                  Go To Finals
                </button>
                <button onClick={() => { setEliminationPhase('setup'); setEliminationCurrentIndex(0); }} className="back-button secondary-button">
                  Back To Rankings
                </button>
              </div>
            ) : (
              <>
                <button onClick={handleNextEliminationMatch} className="cycle-button">
                  Next Match
                </button>
                <div className="button-divider"></div>
                <div className="button-group">
                  <button onClick={() => { setEliminationPhase('finals'); setFinalsCurrentIndex(0); }} className="elimination-button secondary-button">
                    Skip to Finals
                  </button>
                  <button onClick={() => { setEliminationPhase('setup'); setEliminationCurrentIndex(0); }} className="back-button secondary-button">
                    Back To Rankings
                  </button>
                </div>
              </>
            )}
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
        {/* Hide Current Match input in Finals mode */}
        {!(isEliminationMode && eliminationPhase === 'finals') && (
          <div className="control-group match-range-group">
            <label htmlFor="current-match">Current Match:</label>
            <input
              id="current-match"
              type="number"
              min="1"
              max={isEliminationMode && eliminationPhase === 'matches' ? eliminationMatches.length : matches.length}
              value={startMatchInput}
              onChange={handleMatchIndexChange}
            />
            <span className="status-text">of {isEliminationMode && eliminationPhase === 'matches' ? eliminationMatches.length : matches.length}</span>
          </div>
        )}
      </div>

      <div className="display-area">
        {isEliminationMode && eliminationPhase === 'setup' ? (
          <>
            {/* Show rankings first during setup */}
            <div className="on-deck on-deck-setup">
              <div className="on-deck-header">
                <h2>Team Rankings</h2>
                {!isTipVisible && (
                  <button className="show-tip-button" onClick={() => setIsTipVisible(true)} title="Show Tip">
                    💡
                  </button>
                )}
              </div>
              {isTipVisible && (
                <div className="table-editor-instructions">
                  <button className="hide-table-button" onClick={() => setIsTipVisible(false)} title="Hide Tip">
                    ×
                  </button>
                  <p>Enter team rankings below. Then press 'Start Elimination Matches'.</p>
                  <p>🔗 Quick Option 1: Copy & Paste from Excel/Google Sheets. Copy an ordered column of team names. Then put your cursor in top cell of the table below. Then Paste.❗Do not copy a table header.</p>
                  <div>
                    <p>📑 Quick Option 2: Download the Nexus Ranking CSV (Judging&gt;View Rankings&gt;<img src="downloadicon.png" alt="downloadicon" style={{ height: '1.5em', width: 'auto', display: 'inline', verticalAlign: 'top', marginLeft: '2px', marginRight: '2px', filter: 'invert(0.6) brightness(2)' }} />&gt;Download Rankings CSV).&nbsp;
                      <label htmlFor="rankings-csv-upload" style={{ cursor: 'pointer', color: '#4a9eff' }}>
                      Then click here to Upload that CSV.
                      </label>
                      ❗Leave the CSV exactly how Nexus formatted it.
                    </p>
                    <input
                      id="rankings-csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleLoadRankingsCSV}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}
              <div className="on-deck-list">
                <RankingsTable
                  rankings={rankings}
                  onChange={setRankings}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="active-tables">
              <h2>
                {isEliminationMode
                  ? (eliminationPhase === 'finals' ? 'Finals Match' : 'Elimination Match')
                  : 'Current Match'}
              </h2>
              {isEliminationMode && eliminationPhase === 'finals' && (
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#999' }}>
                  Configure the finals matches manually. Simply using the dropdowns to fill in each table's participants.
                </p>
              )}
              {displayMatch && (
            <div className={`tables-grid ${isEliminationMode ? 'elimination-mode' : ''} ${isEliminationMode && eliminationPhase === 'finals' ? 'finals-mode' : ''}`}>
              {/* Red Table */}
              {!hiddenTables.has('red') && (
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 0 ? 'spin' : ''}`}
              >
                <button className="hide-table-button" onClick={() => handleHideTable('red')} title="Hide Red Table">
                  ×
                </button>
                <div className="table-number table-red">R</div>
                <div className="match-number">
                  {isEliminationMode
                    ? (eliminationPhase === 'finals' ? 'Finals Match' : `Elimination Match ${eliminationCurrentIndex + 1}`)
                    : `Match #${displayMatch.number}`}
                </div>
                <div className="team team-red team-1">
                  {isEliminationMode && eliminationPhase === 'finals' ? (
                    <div className="team-dropdown-container-inline">
                      <span className="team-label-inline">R1:</span>
                      <select
                        className="team-dropdown-inline"
                        value={displayMatch.r1}
                        onChange={(e) => handleFinalsTeamChange(finalsCurrentIndex, 'r1', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {getSortedTeamNumbers().map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label={isEliminationMode && eliminationPhase === 'matches' && displayMatch.r1Rank ? `#${displayMatch.r1Rank}` : "R1"}>{getTeamDisplay(displayMatch.r1)}</div>
                  )}
                </div>
                <div className="team team-red team-2">
                  {isEliminationMode && eliminationPhase === 'finals' ? (
                    <div className="team-dropdown-container-inline">
                      <span className="team-label-inline">R2:</span>
                      <select
                        className="team-dropdown-inline"
                        value={displayMatch.r2}
                        onChange={(e) => handleFinalsTeamChange(finalsCurrentIndex, 'r2', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {getSortedTeamNumbers().map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label={isEliminationMode && eliminationPhase === 'matches' && displayMatch.r2Rank ? `#${displayMatch.r2Rank}` : "R2"}>{getTeamDisplay(displayMatch.r2)}</div>
                  )}
                </div>
              </div>
              )}

              {/* Green Table */}
              {!hiddenTables.has('green') && (
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 1 ? 'spin' : ''}`}
              >
                <button className="hide-table-button" onClick={() => handleHideTable('green')} title="Hide Green Table">
                  ×
                </button>
                <div className="table-number table-green">G</div>
                <div className="match-number">
                  {isEliminationMode
                    ? (eliminationPhase === 'finals' ? 'Finals Match' : `Elimination Match ${eliminationCurrentIndex + 1}`)
                    : `Match #${displayMatch.number}`}
                </div>
                <div className="team team-green team-1">
                  {isEliminationMode && eliminationPhase === 'finals' ? (
                    <div className="team-dropdown-container-inline">
                      <span className="team-label-inline">G1:</span>
                      <select
                        className="team-dropdown-inline"
                        value={displayMatch.g1}
                        onChange={(e) => handleFinalsTeamChange(finalsCurrentIndex, 'g1', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {getSortedTeamNumbers().map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label={isEliminationMode && eliminationPhase === 'matches' && displayMatch.g1Rank ? `#${displayMatch.g1Rank}` : "G1"}>{getTeamDisplay(displayMatch.g1)}</div>
                  )}
                </div>
                <div className="team team-green team-2">
                  {isEliminationMode && eliminationPhase === 'finals' ? (
                    <div className="team-dropdown-container-inline">
                      <span className="team-label-inline">G2:</span>
                      <select
                        className="team-dropdown-inline"
                        value={displayMatch.g2}
                        onChange={(e) => handleFinalsTeamChange(finalsCurrentIndex, 'g2', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {getSortedTeamNumbers().map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label={isEliminationMode && eliminationPhase === 'matches' && displayMatch.g2Rank ? `#${displayMatch.g2Rank}` : "G2"}>{getTeamDisplay(displayMatch.g2)}</div>
                  )}
                </div>
              </div>
              )}

              {/* Blue Table */}
              {!hiddenTables.has('blue') && (
              <div
                className={`table-card vertical ${isPulsing ? 'pulse' : ''} ${spinningTableIndex === 2 ? 'spin' : ''}`}
              >
                <button className="hide-table-button" onClick={() => handleHideTable('blue')} title="Hide Blue Table">
                  ×
                </button>
                <div className="table-number table-blue">B</div>
                <div className="match-number">
                  {isEliminationMode
                    ? (eliminationPhase === 'finals' ? 'Finals Match' : `Elimination Match ${eliminationCurrentIndex + 1}`)
                    : `Match #${displayMatch.number}`}
                </div>
                <div className="team team-blue team-1">
                  {isEliminationMode && eliminationPhase === 'finals' ? (
                    <div className="team-dropdown-container-inline">
                      <span className="team-label-inline">B1:</span>
                      <select
                        className="team-dropdown-inline"
                        value={displayMatch.b1}
                        onChange={(e) => handleFinalsTeamChange(finalsCurrentIndex, 'b1', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {getSortedTeamNumbers().map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label={isEliminationMode && eliminationPhase === 'matches' && displayMatch.b1Rank ? `#${displayMatch.b1Rank}` : "B1"}>{getTeamDisplay(displayMatch.b1)}</div>
                  )}
                </div>
                <div className="team team-blue team-2">
                  {isEliminationMode && eliminationPhase === 'finals' ? (
                    <div className="team-dropdown-container-inline">
                      <span className="team-label-inline">B2:</span>
                      <select
                        className="team-dropdown-inline"
                        value={displayMatch.b2}
                        onChange={(e) => handleFinalsTeamChange(finalsCurrentIndex, 'b2', e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {getSortedTeamNumbers().map(num => (
                          <option key={num} value={num}>
                            {getTeamDisplay(num)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="team-name" data-label={isEliminationMode && eliminationPhase === 'matches' && displayMatch.b2Rank ? `#${displayMatch.b2Rank}` : "B2"}>{getTeamDisplay(displayMatch.b2)}</div>
                  )}
                </div>
              </div>
              )}
            </div>
          )}

          {/* Show hidden tables buttons */}
          {hiddenTables.size > 0 && (
            <div className="show-tables-panel">
              <h3>Inactive Tables:</h3>
              {hiddenTables.has('red') && (
                <button className="show-table-button table-red" onClick={() => handleShowTable('red')}>
                  Red
                </button>
              )}
              {hiddenTables.has('green') && (
                <button className="show-table-button table-green" onClick={() => handleShowTable('green')}>
                  Green
                </button>
              )}
              {hiddenTables.has('blue') && (
                <button className="show-table-button table-blue" onClick={() => handleShowTable('blue')}>
                  Blue
                </button>
              )}
            </div>
          )}
            </div>

            {/* Only show on-deck section when not in finals */}
            {!(isEliminationMode && eliminationPhase === 'finals') && (
            <div className="on-deck">
              <div className="on-deck-header">
                <h2>On Deck</h2>
              </div>
              <div className="on-deck-list">
                {isEliminationMode ? (
                  eliminationOnDeckMatches.map((match, index) => (
                  <div key={index} className={`on-deck-card-compact ${jigglingOnDeckIndex === index ? 'jiggle' : ''}`}>
                    <div className="match-number-ondeck">
                      {eliminationPhase === 'matches' ? `Elim Match ${eliminationCurrentIndex + index + 2}` : 'Finals Match'}:
                    </div>
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
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
