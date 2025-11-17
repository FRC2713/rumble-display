import { useState, useRef, useCallback, ClipboardEvent, KeyboardEvent } from 'react'
import './TableEditor.css'

interface TeamRow {
  id: string
  number: string
  name: string
}

interface TeamEditorProps {
  initialTeams?: Map<string, string>
  onSave: (teams: Map<string, string>) => void
  onCancel: () => void
}

export function TeamEditor({ initialTeams, onSave, onCancel }: TeamEditorProps) {
  const [rows, setRows] = useState<TeamRow[]>(() => {
    if (initialTeams && initialTeams.size > 0) {
      return Array.from(initialTeams.entries()).map(([number, name], index) => ({
        id: String(index + 1),
        number,
        name
      }))
    }
    return [{ id: '1', number: '', name: '' }]
  })

  const tableRef = useRef<HTMLDivElement>(null)

  const addRow = useCallback(() => {
    if (rows.length >= 100) {
      alert('Maximum 100 rows allowed')
      return
    }
    const newId = String(rows.length + 1)
    setRows([...rows, {
      id: newId,
      number: '',
      name: ''
    }])
  }, [rows])

  const removeRow = useCallback((id: string) => {
    if (rows.length === 1) {
      alert('Must have at least one row')
      return
    }
    const newRows = rows.filter(row => row.id !== id)
    setRows(newRows)
  }, [rows])

  const updateCell = useCallback((id: string, field: keyof TeamRow, value: string) => {
    setRows(rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ))
  }, [rows])

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>, rowId: string, colIndex: number) => {
    e.preventDefault()

    const pastedText = e.clipboardData.getData('text')
    const pastedRows = pastedText.split('\n').filter(line => line.trim())

    const isTablePaste = pastedRows.length > 1 || pastedText.includes('\t')

    if (!isTablePaste) {
      const currentRow = rows.find(r => r.id === rowId)
      if (currentRow) {
        const fields: (keyof TeamRow)[] = ['number', 'name']
        updateCell(rowId, fields[colIndex], pastedText.trim())
      }
      return
    }

    const parsedData = pastedRows.map(row =>
      row.split('\t').map(cell => cell.trim())
    )

    const startRowIndex = rows.findIndex(r => r.id === rowId)
    if (startRowIndex === -1) return

    const newRows = [...rows]

    parsedData.forEach((rowData, offsetIndex) => {
      const targetRowIndex = startRowIndex + offsetIndex

      while (targetRowIndex >= newRows.length && newRows.length < 100) {
        const newId = String(newRows.length + 1)
        newRows.push({
          id: newId,
          number: '',
          name: ''
        })
      }

      if (targetRowIndex < newRows.length) {
        const row = newRows[targetRowIndex]
        const fields: (keyof TeamRow)[] = ['number', 'name']

        rowData.forEach((cellValue, dataColIndex) => {
          const targetColIndex = colIndex + dataColIndex
          if (targetColIndex < fields.length) {
            row[fields[targetColIndex]] = cellValue
          }
        })
      }
    })

    setRows(newRows)
  }, [rows, updateCell])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>, rowId: string, colIndex: number) => {
    const fields: (keyof TeamRow)[] = ['number', 'name']
    const rowIndex = rows.findIndex(r => r.id === rowId)

    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIndex < rows.length - 1) {
        const nextRow = rows[rowIndex + 1]
        const input = document.querySelector(
          `input[data-row-id="${nextRow.id}"][data-col-index="${colIndex}"]`
        ) as HTMLInputElement
        input?.focus()
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
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
    const teamMap = new Map<string, string>()

    rows.forEach(row => {
      if (row.number && row.name && !teamMap.has(row.number)) {
        teamMap.set(row.number, row.name)
      }
    })

    if (teamMap.size === 0) {
      alert('Please enter at least one team')
      return
    }

    onSave(teamMap)
  }, [rows, onSave])

  const columns = [
    { key: 'number' as const, label: 'Team Number', readonly: false },
    { key: 'name' as const, label: 'Team Name', readonly: false }
  ]

  return (
    <div className="table-editor-container">
      <div className="table-editor-header">
        <h2>Team Names Editor</h2>
        <div className="table-editor-actions">
          <button onClick={addRow} className="editor-button add-button">
            + Add Row
          </button>
          <button onClick={handleSave} className="editor-button save-button">
            Save Teams
          </button>
          <button onClick={onCancel} className="editor-button cancel-button">
            Cancel
          </button>
        </div>
      </div>

      <div className="table-editor-instructions">
        <p>💡 Tip: You can paste from Excel/Google Sheets! Your cursor must be in the Match column when you paste (Ctrl+V or Cmd+V)</p>
        <p>Maximum 100 rows • If a team number appears multiple times, first instance is used</p>
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
                      data-row-id={row.id}
                      data-col-index={colIndex}
                      placeholder={`Enter ${col.label}`}
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
