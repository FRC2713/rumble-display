import type { Match } from '../types/Match'
import type { TeamRanking } from '../components/RankingsTable'

export class EliminationMatchGenerator {
  /**
   * Generate elimination matches based on rankings
   * Pattern: R1, R2, G1, G2, B1, B2
   * 1,30,2,29,3,28
   * 4,27,5,26,6,25
   * 7,24,8,23,9,22
   * 10,21,11,20,12,19
   * 13,18,14,17,15,16
   */
  static generateMatches(rankings: TeamRanking[]): Match[] {
    const matches: Match[] = []

    // Filter out empty rankings (check teamName first, fall back to teamNumber)
    const validRankings = rankings.filter(r =>
      (r.teamName && r.teamName.trim() !== '') || (r.teamNumber && r.teamNumber.trim() !== '')
    )

    if (validRankings.length < 6) {
      // Not enough teams for elimination matches
      return []
    }

    // Calculate how many full matches we can create (each match needs 6 teams)
    const totalTeams = validRankings.length
    const matchCount = Math.floor(totalTeams / 6)

    for (let i = 0; i < matchCount; i++) {
      const match = this.createMatch(i + 1, validRankings, totalTeams)
      matches.push(match)
    }

    return matches
  }

  private static createMatch(matchNumber: number, rankings: TeamRanking[], totalTeams: number): Match {
    // Calculate positions based on the pattern
    // Match 1: ranks 1,30,2,29,3,28
    // Match 2: ranks 4,27,5,26,6,25
    // Match 3: ranks 7,24,8,23,9,22
    // etc.

    const baseIndex = (matchNumber - 1) * 3

    // Low ranks (counting from start)
    const r1Index = baseIndex * 2 + 0  // 0, 3, 6, 9, 12
    const g1Index = baseIndex * 2 + 1  // 1, 4, 7, 10, 13
    const b1Index = baseIndex * 2 + 2  // 2, 5, 8, 11, 14

    // High ranks (counting from end)
    const r2Index = totalTeams - 1 - (baseIndex * 2 + 0)  // 29, 26, 23, 20, 17
    const g2Index = totalTeams - 1 - (baseIndex * 2 + 1)  // 28, 25, 22, 19, 16
    const b2Index = totalTeams - 1 - (baseIndex * 2 + 2)  // 27, 24, 21, 18, 15

    const getTeamIdentifier = (index: number): string => {
      if (index >= 0 && index < rankings.length) {
        // Use teamNumber if available, otherwise use teamName
        return rankings[index].teamNumber || rankings[index].teamName
      }
      return ''
    }

    const getRank = (index: number): number | undefined => {
      if (index >= 0 && index < rankings.length) {
        return rankings[index].rank
      }
      return undefined
    }

    return {
      number: matchNumber,
      r1: getTeamIdentifier(r1Index),
      r2: getTeamIdentifier(r2Index),
      g1: getTeamIdentifier(g1Index),
      g2: getTeamIdentifier(g2Index),
      b1: getTeamIdentifier(b1Index),
      b2: getTeamIdentifier(b2Index),
      r1Rank: getRank(r1Index),
      r2Rank: getRank(r2Index),
      g1Rank: getRank(g1Index),
      g2Rank: getRank(g2Index),
      b1Rank: getRank(b1Index),
      b2Rank: getRank(b2Index)
    }
  }

  /**
   * Create empty finals matches
   */
  static createFinalsMatches(): Match[] {
    return [
      {
        number: 0,
        r1: '',
        r2: '',
        g1: '',
        g2: '',
        b1: '',
        b2: ''
      },
      {
        number: 0,
        r1: '',
        r2: '',
        g1: '',
        g2: '',
        b1: '',
        b2: ''
      }
    ]
  }
}
