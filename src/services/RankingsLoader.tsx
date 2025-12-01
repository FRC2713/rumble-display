import type { TeamRanking } from '../components/RankingsTable'

export class RankingsLoader {
  static async loadFromFile(file: File): Promise<TeamRanking[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const rankings = this.parseCSV(text)
          resolve(rankings)
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

  static parseCSV(text: string): TeamRanking[] {
    const lines = text.split('\n').filter(line => line.trim())
    const rankings: TeamRanking[] = []

    lines.forEach((line, index) => {
      const cells = line.split(',').map(cell => cell.trim())

      // Skip header row if it exists (check if first cell is "rank" or similar)
      if (index === 0 && isNaN(parseInt(cells[0]))) {
        return
      }

      // Parse formats:
      // Format 1: rank, teamName, teamNumber (3 columns)
      // Format 2: rank, teamName (2 columns)
      // Format 3: teamName only (1 column)

      let rank: number
      let teamName: string
      let teamNumber: string | undefined

      if (cells.length >= 3) {
        // Format 1: rank, teamName, teamNumber
        rank = parseInt(cells[0]) || rankings.length + 1
        teamName = cells[1]
        teamNumber = cells[2]
      } else if (cells.length === 2) {
        // Format 2: rank, teamName
        rank = parseInt(cells[0]) || rankings.length + 1
        teamName = cells[1]
      } else if (cells.length === 1) {
        // Format 3: teamName only
        rank = rankings.length + 1
        teamName = cells[0]
      } else {
        return // Skip invalid lines
      }

      rankings.push({
        rank,
        teamName,
        teamNumber
      })
    })

    // Sort by rank to ensure correct order
    rankings.sort((a, b) => a.rank - b.rank)

    // Re-index ranks to be sequential starting from 1
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1
    })

    return rankings
  }
}
