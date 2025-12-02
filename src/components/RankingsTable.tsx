import { useCallback } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import './TableEditor.css'

export interface TeamRanking {
  rank: number
  teamName: string
  teamNumber?: string
}

interface RankingsTableProps {
  rankings: TeamRanking[]
  onChange: (rankings: TeamRanking[]) => void
}

export function RankingsTable({ rankings, onChange }: RankingsTableProps) {
  const updateCell = useCallback((rowIndex: number, field: 'teamName' | 'teamNumber', value: string) => {
    const newRankings = rankings.map((ranking, idx) =>
      idx === rowIndex ? { ...ranking, [field]: value } : ranking
    )
    onChange(newRankings)
  }, [rankings, onChange])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    e.preventDefault()

    const pastedText = e.clipboardData.getData('text')
    const pastedRows = pastedText.split('\n').filter(line => line.trim())

    // Check if this is a table paste (has tabs or multiple rows)
    const isTablePaste = pastedRows.length > 1 || pastedText.includes('\t')

    if (!isTablePaste) {
      // Single cell paste
      const field = colIndex === 0 ? 'teamName' : 'teamNumber'
      updateCell(rowIndex, field, pastedText.trim())
      return
    }

    // Table paste - parse the clipboard data
    const parsedData = pastedRows.map(row =>
      row.split('\t').map(cell => cell.trim())
    )

    const newRankings = [...rankings]

    // Extend rankings array if needed
    const maxNeededRows = rowIndex + parsedData.length
    while (newRankings.length < maxNeededRows) {
      newRankings.push({
        rank: newRankings.length + 1,
        teamNumber: '',
        teamName: ''
      })
    }

    parsedData.forEach((rowData, offsetIndex) => {
      const targetRowIndex = rowIndex + offsetIndex

      if (targetRowIndex < newRankings.length) {
        const ranking = newRankings[targetRowIndex]

        // Handle different paste formats:
        // Format 1: rank, teamName, teamNumber (3 columns)
        // Format 2: rank, teamName (2 columns)
        // Format 3: teamName only (1 column)

        if (rowData.length >= 3) {
          // Format 1: rank, teamName, teamNumber
          ranking.teamName = rowData[1]
          ranking.teamNumber = rowData[2]
        } else if (rowData.length === 2) {
          // Format 2: rank, teamName or teamName, teamNumber
          // We'll assume it's teamName, teamNumber based on colIndex
          if (colIndex === 0) {
            ranking.teamName = rowData[0]
            ranking.teamNumber = rowData[1]
          } else {
            ranking.teamNumber = rowData[0]
          }
        } else if (rowData.length === 1) {
          // Format 3: single column
          const field = colIndex === 0 ? 'teamName' : 'teamNumber'
          ranking[field] = rowData[0]
        }
      }
    })

    onChange(newRankings)
  }, [rankings, onChange, updateCell])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex < rankings.length - 1) {
        const input = document.querySelector(
          `input[data-row-index="${rowIndex + 1}"][data-col-index="${colIndex}"]`
        ) as HTMLInputElement
        input?.focus()
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      if (colIndex === 1 && rowIndex < rankings.length - 1) {
        e.preventDefault()
        const input = document.querySelector(
          `input[data-row-index="${rowIndex + 1}"][data-col-index="0"]`
        ) as HTMLInputElement
        input?.focus()
      }
    }
  }, [rankings.length])

  return (
    <div className="rankings-container">
      <table className="ondeck-elimination-table rankings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team Name</th>
            <th>Team # (Optional)</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((ranking, rowIndex) => (
            <tr key={rowIndex}>
              <td className="rank-cell">{ranking.rank}</td>
              <td>
                <input
                  type="text"
                  value={ranking.teamName}
                  onChange={(e) => updateCell(rowIndex, 'teamName', e.target.value)}
                  onPaste={(e) => handlePaste(e, rowIndex, 0)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                  data-row-index={rowIndex}
                  data-col-index={0}
                  placeholder="Team Name"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={ranking.teamNumber || ''}
                  onChange={(e) => updateCell(rowIndex, 'teamNumber', e.target.value)}
                  onPaste={(e) => handlePaste(e, rowIndex, 1)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                  data-row-index={rowIndex}
                  data-col-index={1}
                  placeholder="Team #"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
