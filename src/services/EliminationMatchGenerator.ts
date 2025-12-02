import type { Match } from '../types/Match'
import type { TeamRanking } from '../components/RankingsTable'

export class EliminationMatchGenerator {
  /**
   * Match schedule from rhr25-elim-matches.csv
   * Format: Match #,R1,R2,B1,B2,G1,G2 (values are rankings, not team numbers)
   * 1,1,30,2,29,3,28
   * 2,4,27,5,26,6,25
   * 3,7,24,8,23,9,22
   * 4,10,21,11,20,12,19
   * 5,13,18,14,17,15,16
   */
  private static readonly MATCH_SCHEDULE = [
    { matchNum: 1, r1: 1, r2: 30, b1: 2, b2: 29, g1: 3, g2: 28 },
    { matchNum: 2, r1: 4, r2: 27, b1: 5, b2: 26, g1: 6, g2: 25 },
    { matchNum: 3, r1: 7, r2: 24, b1: 8, b2: 23, g1: 9, g2: 22 },
    { matchNum: 4, r1: 10, r2: 21, b1: 11, b2: 20, g1: 12, g2: 19 },
    { matchNum: 5, r1: 13, r2: 18, b1: 14, b2: 17, g1: 15, g2: 16 }
  ]

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

    // Helper to get team by rank (1-based)
    const getTeamByRank = (rank: number): string => {
      const ranking = validRankings.find(r => r.rank === rank)
      if (ranking) {
        return ranking.teamNumber || ranking.teamName
      }
      return ''
    }

    // Generate matches from the schedule
    for (const schedule of this.MATCH_SCHEDULE) {
      // Only create match if all required ranks exist
      if (validRankings.length >= Math.max(schedule.r1, schedule.r2, schedule.b1, schedule.b2, schedule.g1, schedule.g2)) {
        matches.push({
          number: schedule.matchNum,
          r1: getTeamByRank(schedule.r1),
          r2: getTeamByRank(schedule.r2),
          b1: getTeamByRank(schedule.b1),
          b2: getTeamByRank(schedule.b2),
          g1: getTeamByRank(schedule.g1),
          g2: getTeamByRank(schedule.g2),
          r1Rank: schedule.r1,
          r2Rank: schedule.r2,
          b1Rank: schedule.b1,
          b2Rank: schedule.b2,
          g1Rank: schedule.g1,
          g2Rank: schedule.g2
        })
      }
    }

    return matches
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
