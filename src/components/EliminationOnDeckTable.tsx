import { useCallback } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import type { Match } from '../types/Match'
import './TableEditor.css'

interface EliminationOnDeckTableProps {
  matches: Match[]
  onChange: (matches: Match[]) => void
}

type TeamField = 'r1' | 'r2' | 'g1' | 'g2' | 'b1' | 'b2'

export function EliminationOnDeckTable({ matches, onChange }: EliminationOnDeckTableProps) {
  const updateCell = useCallback((rowIndex: number, field: TeamField, value: string) => {
    const newMatches = matches.map((match, idx) =>
      idx === rowIndex ? { ...match, [field]: value } : match
    )
    onChange(newMatches)
  }, [matches, onChange])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    e.preventDefault()

    const pastedText = e.clipboardData.getData('text')
    const pastedRows = pastedText.split('\n').filter(line => line.trim())

    // Check if this is a table paste (has tabs or multiple rows)
    const isTablePaste = pastedRows.length > 1 || pastedText.includes('\t')

    if (!isTablePaste) {
      // Single cell paste
      const fields: TeamField[] = ['r1', 'r2', 'g1', 'g2', 'b1', 'b2']
      updateCell(rowIndex, fields[colIndex], pastedText.trim())
      return
    }

    // Table paste - parse the clipboard data
    const parsedData = pastedRows.map(row =>
      row.split('\t').map(cell => cell.trim())
    )

    const newMatches = [...matches]

    parsedData.forEach((rowData, offsetIndex) => {
      const targetRowIndex = rowIndex + offsetIndex

      if (targetRowIndex < newMatches.length) {
        const match = newMatches[targetRowIndex]
        const fields: TeamField[] = ['r1', 'r2', 'g1', 'g2', 'b1', 'b2']

        // Paste data starting from the selected column
        rowData.forEach((cellValue, dataColIndex) => {
          const targetColIndex = colIndex + dataColIndex
          if (targetColIndex < fields.length) {
            const field = fields[targetColIndex]
            match[field] = cellValue
          }
        })
      }
    })

    onChange(newMatches)
  }, [matches, onChange, updateCell])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const fields: (keyof Match)[] = ['r1', 'r2', 'g1', 'g2', 'b1', 'b2']

    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex < matches.length - 1) {
        const input = document.querySelector(
          `input[data-row-index="${rowIndex + 1}"][data-col-index="${colIndex}"]`
        ) as HTMLInputElement
        input?.focus()
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      if (colIndex === fields.length - 1 && rowIndex < matches.length - 1) {
        e.preventDefault()
        const input = document.querySelector(
          `input[data-row-index="${rowIndex + 1}"][data-col-index="0"]`
        ) as HTMLInputElement
        input?.focus()
      }
    }
  }, [matches.length])

  return (
    <table className="ondeck-elimination-table">
      <thead>
        <tr>
          <th>R1</th>
          <th>R2</th>
          <th>G1</th>
          <th>G2</th>
          <th>B1</th>
          <th>B2</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((match, rowIndex) => (
          <tr key={rowIndex}>
            <td>
              <input
                type="text"
                value={match.r1}
                onChange={(e) => updateCell(rowIndex, 'r1', e.target.value)}
                onPaste={(e) => handlePaste(e, rowIndex, 0)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                data-row-index={rowIndex}
                data-col-index={0}
                placeholder="Team #"
              />
            </td>
            <td>
              <input
                type="text"
                value={match.r2}
                onChange={(e) => updateCell(rowIndex, 'r2', e.target.value)}
                onPaste={(e) => handlePaste(e, rowIndex, 1)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                data-row-index={rowIndex}
                data-col-index={1}
                placeholder="Team #"
              />
            </td>
            <td>
              <input
                type="text"
                value={match.g1}
                onChange={(e) => updateCell(rowIndex, 'g1', e.target.value)}
                onPaste={(e) => handlePaste(e, rowIndex, 2)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                data-row-index={rowIndex}
                data-col-index={2}
                placeholder="Team #"
              />
            </td>
            <td>
              <input
                type="text"
                value={match.g2}
                onChange={(e) => updateCell(rowIndex, 'g2', e.target.value)}
                onPaste={(e) => handlePaste(e, rowIndex, 3)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
                data-row-index={rowIndex}
                data-col-index={3}
                placeholder="Team #"
              />
            </td>
            <td>
              <input
                type="text"
                value={match.b1}
                onChange={(e) => updateCell(rowIndex, 'b1', e.target.value)}
                onPaste={(e) => handlePaste(e, rowIndex, 4)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, 4)}
                data-row-index={rowIndex}
                data-col-index={4}
                placeholder="Team #"
              />
            </td>
            <td>
              <input
                type="text"
                value={match.b2}
                onChange={(e) => updateCell(rowIndex, 'b2', e.target.value)}
                onPaste={(e) => handlePaste(e, rowIndex, 5)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, 5)}
                data-row-index={rowIndex}
                data-col-index={5}
                placeholder="Team #"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
