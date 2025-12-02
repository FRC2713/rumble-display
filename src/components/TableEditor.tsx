import { useState, useRef, useCallback } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import type { Match } from '../types/Match'
import './TableEditor.css'

interface TableRow {
  id: string
  match: string
  time: string
  r1: string
  r2: string
  g1: string
  g2: string
  b1: string
  b2: string
}

interface TableEditorProps {
  initialMatches?: Match[]
  onSave: (matches: Match[]) => void
  onCancel: () => void
}

export function TableEditor({ initialMatches, onSave, onCancel }: TableEditorProps) {
  const [rows, setRows] = useState<TableRow[]>(() => {
    if (initialMatches && initialMatches.length > 0) {
      return initialMatches.map((match, index) => ({
        id: String(index + 1),
        match: String(match.number),
        time: '',
        r1: match.r1,
        r2: match.r2,
        g1: match.g1,
        g2: match.g2,
        b1: match.b1,
        b2: match.b2
      }))
    }
    return [{ id: '1', match: '1', time: '', r1: '', r2: '', g1: '', g2: '', b1: '', b2: '' }]
  })
  const [_selectedCell, setSelectedCell] = useState<{ rowId: string; colIndex: number } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const addRow = useCallback(() => {
    if (rows.length >= 100) {
      alert('Maximum 100 rows allowed')
      return
    }
    const newId = String(rows.length + 1)
    setRows([...rows, {
      id: newId,
      match: String(rows.length + 1),
      time: '',
      r1: '',
      r2: '',
      g1: '',
      g2: '',
      b1: '',
      b2: ''
    }])
  }, [rows])

  const removeRow = useCallback((id: string) => {
    if (rows.length === 1) {
      alert('Must have at least one row')
      return
    }
    const newRows = rows.filter(row => row.id !== id)
    // Renumber match column
    newRows.forEach((row, index) => {
      row.match = String(index + 1)
    })
    setRows(newRows)
  }, [rows])

  const updateCell = useCallback((id: string, field: keyof TableRow, value: string) => {
    setRows(rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ))
  }, [rows])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>, rowId: string, colIndex: number) => {
    e.preventDefault()

    const pastedText = e.clipboardData.getData('text')
    const pastedRows = pastedText.split('\n').filter(line => line.trim())

    // Check if this is a table paste (has tabs or multiple rows)
    const isTablePaste = pastedRows.length > 1 || pastedText.includes('\t')

    if (!isTablePaste) {
      // Single cell paste
      const currentRow = rows.find(r => r.id === rowId)
      if (currentRow) {
        const fields: (keyof TableRow)[] = ['match', 'time', 'r1', 'r2', 'g1', 'g2', 'b1', 'b2']
        updateCell(rowId, fields[colIndex], pastedText.trim())
      }
      return
    }

    // Table paste - parse the clipboard data
    const parsedData = pastedRows.map(row =>
      row.split('\t').map(cell => cell.trim())
    )

    // Find the row index where we're pasting
    const startRowIndex = rows.findIndex(r => r.id === rowId)
    if (startRowIndex === -1) return

    const newRows = [...rows]

    parsedData.forEach((rowData, offsetIndex) => {
      const targetRowIndex = startRowIndex + offsetIndex

      // Add new rows if needed
      while (targetRowIndex >= newRows.length && newRows.length < 100) {
        const newId = String(newRows.length + 1)
        newRows.push({
          id: newId,
          match: String(newRows.length + 1),
          time: '',
          r1: '',
          r2: '',
          g1: '',
          g2: '',
          b1: '',
          b2: ''
        })
      }

      if (targetRowIndex < newRows.length) {
        const row = newRows[targetRowIndex]
        const fields: (keyof TableRow)[] = ['match', 'time', 'r1', 'r2', 'g1', 'g2', 'b1', 'b2']

        // Paste data starting from the selected column
        rowData.forEach((cellValue, dataColIndex) => {
          const targetColIndex = colIndex + dataColIndex
          if (targetColIndex < fields.length) {
            row[fields[targetColIndex]] = cellValue
          }
        })

        // Update match number
        row.match = String(targetRowIndex + 1)
      }
    })

    setRows(newRows)
  }, [rows, updateCell])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, rowId: string, colIndex: number) => {
    const fields: (keyof TableRow)[] = ['match', 'time', 'r1', 'r2', 'g1', 'g2', 'b1', 'b2']
    const rowIndex = rows.findIndex(r => r.id === rowId)

    if (e.key === 'Enter') {
      e.preventDefault()
      // Move to next row, same column
      if (rowIndex < rows.length - 1) {
        const nextRow = rows[rowIndex + 1]
        const input = document.querySelector(
          `input[data-row-id="${nextRow.id}"][data-col-index="${colIndex}"]`
        ) as HTMLInputElement
        input?.focus()
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // Let default tab behavior work, but ensure we stay in table
      if (colIndex === fields.length - 1 && rowIndex < rows.length - 1) {
        e.preventDefault()
        const nextRow = rows[rowIndex + 1]
        const input = document.querySelector(
          `input[data-row-id="${nextRow.id}"][data-col-index="0"]`
        ) as HTMLInputElement
        input?.focus()
      }
    }
  }, [rows])

  const handleSave = useCallback(() => {
    const matches: Match[] = rows
      .filter(row => row.r1 || row.r2 || row.g1 || row.g2 || row.b1 || row.b2) // Only include rows with data
      .map((row, index) => ({
        number: index + 1,
        time: row.time || undefined,
        r1: row.r1,
        r2: row.r2,
        b1: row.b1,
        b2: row.b2,
        g1: row.g1,
        g2: row.g2
      }))

    if (matches.length === 0) {
      alert('Please enter at least one match')
      return
    }

    onSave(matches)
  }, [rows, onSave])

  const columns = [
    { key: 'match' as const, label: 'Match', readonly: false },
    { key: 'time' as const, label: 'Time', readonly: false },
    { key: 'r1' as const, label: 'R1', readonly: false },
    { key: 'r2' as const, label: 'R2', readonly: false },
    { key: 'g1' as const, label: 'G1', readonly: false },
    { key: 'g2' as const, label: 'G2', readonly: false },
    { key: 'b1' as const, label: 'B1', readonly: false },
    { key: 'b2' as const, label: 'B2', readonly: false }
  ]

  return (
    <div className="table-editor-container">
      <div className="table-editor-header">
        <h2>Manual Match Entry</h2>
        <div className="table-editor-actions">
          <button onClick={addRow} className="editor-button add-button">
            + Add Row
          </button>
          <button onClick={handleSave} className="editor-button save-button">
            Start Event w/ These Matches
          </button>
          <button onClick={onCancel} className="editor-button cancel-button">
            Go Back
          </button>
        </div>
      </div>

      <div className="table-editor-instructions">
        <p>💡 Tip: You can paste from Excel/Google Sheets! Put your cursor in top-left-most cell of the table and then you paste (Ctrl+V or Cmd+V)</p>
        <p>❗ Do not copy the table headers. Note the column order is Match, Time, R1, R2, G1, G2, B1, B2</p>
        <p>Maximum 100 rows • Time column is optional</p>
      </div>

      <div className="table-editor-scroll" ref={tableRef}>
        <table className="match-table">
          <thead>
            <tr>
              <th className="row-number-col">#</th>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <td className="row-number-col">{rowIndex + 1}</td>
                {columns.map((col, colIndex) => (
                  <td key={col.key}>
                    <input
                      type="text"
                      value={row[col.key]}
                      onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                      onPaste={(e) => handlePaste(e, row.id, colIndex)}
                      onKeyDown={(e) => handleKeyDown(e, row.id, colIndex)}
                      onFocus={() => setSelectedCell({ rowId: row.id, colIndex })}
                      disabled={col.readonly}
                      data-row-id={row.id}
                      data-col-index={colIndex}
                      className={col.readonly ? 'readonly' : ''}
                      placeholder={col.readonly ? '' : `Enter ${col.label}`}
                    />
                  </td>
                ))}
                <td className="actions-col">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="remove-button"
                    title="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-editor-footer">
        <span className="row-count">{rows.length} / 100 rows</span>
      </div>
    </div>
  )
}
