# Data Loading Services

This directory contains services for loading match and team data.

## CsvLoader

Handles loading and parsing CSV files containing match data.

### Methods

- `parseCSV(text: string): Match[]` - Parse CSV text into Match objects
- `loadDefaultMatches(): Promise<Match[]>` - Load the default rhr25-matches.csv from the repository
- `loadFromFile(file: File): Promise<Match[]>` - Load matches from a user-uploaded CSV file

### CSV Format

The CSV file should contain the following columns (no header):
```
Match Number, Time, R1, R2, B1, B2, G1, G2
```

Example:
```
1,,64989,73089,59434,73273,67063,56882
2,,31951,65060,57294,73074,60366,70767
```

Note: Time column is optional and can be left empty.

## TeamLoader

Handles loading and parsing CSV files containing team names.

### Methods

- `parseTeamCSV(text: string): Map<string, string>` - Parse CSV text into a Map of team number -> team name
- `loadDefaultTeams(): Promise<Map<string, string>>` - Load the default rhr25-teams.csv from the repository
- `loadFromFile(file: File): Promise<Map<string, string>>` - Load teams from a user-uploaded CSV file
- `getTeamDisplay(teamNumber: string, teamMap: Map<string, string>): string` - Get display name for a team (returns name if available, otherwise #<team-number>)

### CSV Format

The CSV file should contain the following columns (no header):
```
Team Number, Team Name
```

Example:
```
64989,Robocats
73089,Crypto Crew
67063,Lexington Lobsters
```

**Note:** If a team number appears multiple times, only the first instance is used.

## Usage in App

```typescript
import { CsvLoader } from './services/CsvLoader'
import { TeamLoader } from './services/TeamLoader'

// Load default matches
const matches = await CsvLoader.loadDefaultMatches()

// Load default team names
const teams = await TeamLoader.loadDefaultTeams()

// Get display name for a team
const displayName = TeamLoader.getTeamDisplay('64989', teams) // Returns "Robocats"
const unknownTeam = TeamLoader.getTeamDisplay('99999', teams) // Returns "#99999" if not found
```
