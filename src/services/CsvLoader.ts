import type { Match } from '../types/Match'

export class CsvLoader {
  /**
   * Parse CSV text content into Match objects
   * CSV Format (with time): Match, Time, R1, R2, B1, B2, G1, G2
   * CSV Format (without time): Match, R1, R2, B1, B2, G1, G2
   */
  static parseCSV(text: string): Match[] {
    const lines = text.split('\n').filter(line => line.trim())

    const parsedMatches: Match[] = lines.map(line => {
      const parts = line.split(',').map(s => s.trim())

      // Detect format based on number of columns
      if (parts.length === 8) {
        // Format with time: Match, Time, R1, R2, B1, B2, G1, G2
        const [number, time, r1, r2, b1, b2, g1, g2] = parts
        return {
          number: parseInt(number),
          time: time || undefined,
          r1,
          r2,
          b1,
          b2,
          g1,
          g2
        }
      } else {
        // Format without time: Match, R1, R2, B1, B2, G1, G2
        const [number, r1, r2, b1, b2, g1, g2] = parts
        return {
          number: parseInt(number),
          r1,
          r2,
          b1,
          b2,
          g1,
          g2
        }
      }
    }).filter(match => !isNaN(match.number))

    return parsedMatches
  }

  /**
   * Load the default CSV file from the repository
   */
  static async loadDefaultMatches(): Promise<Match[]> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}rhr25-matches.csv`)
      if (!response.ok) {
        throw new Error(`Failed to load default matches: ${response.statusText}`)
      }
      const text = await response.text()
      return this.parseCSV(text)
    } catch (error) {
      console.error('Error loading default matches:', error)
      return []
    }
  }

  /**
   * Load matches from a user-uploaded file
   */
  static async loadFromFile(file: File): Promise<Match[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const matches = this.parseCSV(text)
          resolve(matches)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  }
}
