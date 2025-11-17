import type { Team } from '../types/Team'

export class TeamLoader {
  /**
   * Parse CSV text content into a Map of team number -> team name
   */
  static parseTeamCSV(text: string): Map<string, string> {
    const lines = text.split('\n').filter(line => line.trim())
    const teamMap = new Map<string, string>()

    lines.forEach(line => {
      const [number, name] = line.split(',').map(s => s.trim())
      // Only use first instance of each team number
      if (number && name && !teamMap.has(number)) {
        teamMap.set(number, name)
      }
    })

    return teamMap
  }

  /**
   * Load the default team names CSV file from the repository
   */
  static async loadDefaultTeams(): Promise<Map<string, string>> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}rhr25-teams.csv`)
      if (!response.ok) {
        throw new Error(`Failed to load default teams: ${response.statusText}`)
      }
      const text = await response.text()
      return this.parseTeamCSV(text)
    } catch (error) {
      console.error('Error loading default teams:', error)
      return new Map()
    }
  }

  /**
   * Load teams from a user-uploaded file
   */
  static async loadFromFile(file: File): Promise<Map<string, string>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const teamMap = this.parseTeamCSV(text)
          resolve(teamMap)
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

  /**
   * Get display name for a team number
   * Returns the team name if available, otherwise returns #<team-number>
   */
  static getTeamDisplay(teamNumber: string, teamMap: Map<string, string>): string {
    const name = teamMap.get(teamNumber)
    return name || `#${teamNumber}`
  }
}
