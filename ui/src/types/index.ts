export type CricketFormat = 'T20' | 'T30' | 'T45' | 'T50';
export type BattingPosition = 'OPENER' | 'TOP_ORDER' | 'MIDDLE_ORDER' | 'LOWER_MIDDLE_ORDER' | 'LOWER_ORDER';
export type BattingStance = 'LEFT_HANDED' | 'RIGHT_HANDED';
export type BowlingArm = 'LEFT' | 'RIGHT';
export type BowlingType = 'VERY_FAST' | 'FAST' | 'FAST_MEDIUM' | 'MEDIUM_FAST' | 'MEDIUM' | 'MEDIUM_SLOW' | 'OFF_SPIN' | 'LEG_SPIN' | 'SLOW_LEFT_ARM_ORTHODOX' | 'CHINAMAN' | 'NONE';
export type ClothingSize = 'XXS' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export type Gender = 'MALE' | 'FEMALE';
export type AgeGroup = 'UNDER_9' | 'UNDER_10' | 'UNDER_11' | 'UNDER_12' | 'UNDER_13' | 'UNDER_14' | 'UNDER_15' | 'UNDER_16' | 'UNDER_18' | 'UNDER_19' | 'OPEN' | 'VETERANS' | 'OVER_50' | 'OVER_60';
export type TournamentGender = 'MEN' | 'WOMEN' | 'BOYS' | 'GIRLS';
export type DismissalType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'NOT_OUT';

export type MatchStage = 'POOL' | 'SEMI_FINAL' | 'FINAL';
export type TossWinner = 'HOME' | 'OPPOSITION';
export type TossDecision = 'BAT' | 'BOWL';

export type PaymentType = 'PLAYER' | 'SPONSOR' | 'AD_HOC';
export type PaymentCategory = 'TOURNAMENT_FEE' | 'TOURNAMENT_REGISTRATION' | 'ANNUAL_SUBSCRIPTION' | 'SPONSORSHIP' | 'AD_HOC' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Payment {
  paymentId?: number;
  paymentType: PaymentType;
  paymentCategory?: PaymentCategory;
  playerId?: number;
  playerName?: string;
  sponsorId?: number;
  sponsorName?: string;
  tournamentId?: number;
  tournamentName?: string;
  paymentDate: string;
  amount: number;
  taxable?: boolean;
  status?: PaymentStatus;
  description?: string;
  rejectionReason?: string;
  proofOfPaymentUrl?: string;
  createdAt?: string;
}

export interface WalletAllocationDTO {
  id: number;
  playerId: number;
  playerName: string;
  amount: number;
  category: string;
  description?: string;
  allocationDate: string;
  createdAt?: string;
}

export interface AllocationResultDTO {
  allocated: { playerId: number; playerName: string; amount: number }[];
  skipped: { playerId: number; playerName: string; reason: string; walletBalance: number; required: number }[];
}

export interface WalletDTO {
  balance: number;
  transactions: Payment[];
  allocations: WalletAllocationDTO[];
}

export interface Sponsor {
  sponsorId?: number;
  name: string;
  brandLogoUrl?: string;
  printLogoUrl?: string;
  brandWebsite?: string;
  contactPerson?: string;
  contactNumber?: string;
  contactEmail?: string;
  address?: string;
  vatNumber?: string;
  registrationNumber?: string;
}

export interface Club {
  clubId?: number;
  name: string;
  logoUrl?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  contactPerson?: string;
  email?: string;
  contactNumber?: string;
}

export type MediaFileType = 'IMAGE' | 'VIDEO';

export interface MediaContent {
  id?: number;
  url: string;
  caption?: string;
  mediaType?: MediaFileType;
  playerId?: number;
  playerName?: string;
  teamId?: number;
  teamName?: string;
  matchId?: number;
  matchLabel?: string;
  tournamentId?: number;
  tournamentName?: string;
  fieldId?: number;
  fieldName?: string;
  clubId?: number;
  clubName?: string;
  uploadedAt?: string;
}

export interface Field {
  fieldId?: number;
  name: string;
  address?: string;
  googleMapsUrl?: string;
  iconUrl?: string;
  homeClubId?: number;
  homeClubName?: string;
}

export interface Player {
  playerId?: number;
  name: string;
  surname: string;
  dateOfBirth?: string;
  contactNumber?: string;
  email?: string;
  alternativeContactNumber?: string;
  shirtNumber?: number;
  profilePictureUrl?: string;
  careerUrl?: string;
  battingPosition?: BattingPosition;
  battingStance?: BattingStance;
  bowlingArm?: BowlingArm;
  bowlingType?: BowlingType;
  wicketKeeper?: boolean;
  partTimeBowler?: boolean;
  shirtSize?: ClothingSize;
  pantSize?: ClothingSize;
  gender?: Gender;
  homeClubId?: number;
  homeClubName?: string;
  mediaContent?: MediaContent[];
}

export interface Team {
  teamId?: number;
  teamName: string;
  abbreviation?: string;
  associatedClubId?: number;
  associatedClubName?: string;
  coach?: string;
  manager?: string;
  administrator?: string;
  email?: string;
  contactNumber?: string;
  captainId?: number;
  captainName?: string;
  homeFieldId?: number;
  homeFieldName?: string;
  selector?: string;
  logoUrl?: string;
  teamPhotoUrl?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  mediaContent?: MediaContent[];
  sponsors?: Sponsor[];
}

export interface TournamentTeam {
  tournamentTeamId?: number;
  poolId?: number;
  teamId?: number;
  teamName?: string;
}

export interface TournamentPool {
  poolId?: number;
  poolName: string;
  tournamentId?: number;
  teams?: TournamentTeam[];
}

export interface Tournament {
  tournamentId?: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  cricketFormat?: CricketFormat;
  ageGroup?: AgeGroup;
  tournamentGender?: TournamentGender;
  bannerUrl?: string;
  logoUrl?: string;
  playingConditionsUrl?: string;
  websiteLink?: string;
  facebookLink?: string;
  registrationPageUrl?: string;
  entryFee?: number;
  registrationFee?: number;
  matchFee?: number;
  winningTeamId?: number;
  winningTeamName?: string;
  pointsForWin?: number;
  pointsForDraw?: number;
  pointsForNoResult?: number;
  pointsForBonus?: number;
  pools?: TournamentPool[];
  mediaContent?: MediaContent[];
  sponsors?: Sponsor[];
}

export interface Match {
  matchId?: number;
  matchDate?: string;
  scheduledStartTime?: string;
  tossTime?: string;
  arrivalTime?: string;
  umpire?: string;
  matchStage?: MatchStage;
  tossWonBy?: TossWinner;
  tossDecision?: TossDecision;
  homeTeamId?: number;
  homeTeamName?: string;
  homeTeamLogoUrl?: string;
  oppositionTeamId?: number;
  oppositionTeamName?: string;
  oppositionTeamLogoUrl?: string;
  fieldId?: number;
  fieldName?: string;
  fieldGoogleMapsUrl?: string;
  scoringUrl?: string;
  tournamentId?: number;
  tournamentName?: string;
}

export interface BattingEntry {
  playerId?: number;
  playerName?: string;
  battingPosition?: number;
  batted?: boolean;
  score?: number;
  ballsFaced?: number;
  fours?: number;
  sixes?: number;
  dots?: number;
  dismissed?: boolean;
  dismissalType?: string;
  dismissedBowler?: string;
  dismissedDescription?: string;
}

export interface BowlingEntry {
  playerId?: number;
  playerName?: string;
  overs?: string;
  maidens?: number;
  runs?: number;
  wickets?: number;
  dots?: number;
  wides?: number;
  noBalls?: number;
}

export interface TeamScorecard {
  teamId?: number;
  score?: number;
  wickets?: number;
  overs?: string;
  batting?: BattingEntry[];
  bowling?: BowlingEntry[];
}

export interface ScorecardData {
  teamA?: TeamScorecard;
  teamB?: TeamScorecard;
}

export interface MatchResultSummary {
  matchId: number;
  matchDate?: string;
  homeTeamName?: string;
  oppositionTeamName?: string;
  fieldName?: string;
  scoringUrl?: string;
  sideBattingFirstName?: string;
  scoreBattingFirst?: number;
  wicketsLostBattingFirst?: number;
  oversBattingFirst?: string;
  scoreBattingSecond?: number;
  wicketsLostBattingSecond?: number;
  oversBattingSecond?: string;
  matchDrawn?: boolean;
  decidedOnDLS?: boolean;
  wonWithBonusPoint?: boolean;
  winningTeamName?: string;
  manOfTheMatchName?: string;
  matchOutcomeDescription?: string;
}

export interface PoolStandingEntry {
  teamId: number;
  teamName: string;
  logoUrl?: string;
  gamesPlayed: number;
  won: number;
  lost: number;
  noResults: number;
  draws: number;
  points: number;
  bonusPoints: number;
  netRunRate: number;
}

export interface PoolStandings {
  poolId: number;
  poolName: string;
  entries: PoolStandingEntry[];
}

export interface MatchResult {
  matchResultId?: number;
  matchId?: number;
  matchCompleted?: boolean;
  matchDrawn?: boolean;
  decidedOnDLS?: boolean;
  wonWithBonusPoint?: boolean;
  winningTeamId?: number;
  winningTeamName?: string;
  manOfTheMatchId?: number;
  manOfTheMatchName?: string;
  sideBattingFirstId?: number;
  sideBattingFirstName?: string;
  scoreBattingFirst?: number;
  wicketsLostBattingFirst?: number;
  oversBattingFirst?: string;
  scoreBattingSecond?: number;
  wicketsLostBattingSecond?: number;
  oversBattingSecond?: string;
  matchOutcomeDescription?: string;
  scoreCard?: ScorecardData;
}

export interface PlayerResult {
  playerResultId?: number;
  playerId?: number;
  playerName?: string;
  matchId?: number;
  teamId?: number;
  teamName?: string;
  battingPosition?: number;
  score?: number;
  ballsFaced?: number;
  foursHit?: number;
  sixesHit?: number;
  dismissed?: boolean;
  dismissedByBowlerId?: number;
  dismissedByBowlerName?: string;
  dismissalType?: DismissalType;
  oversBowled?: string;
  wickets?: number;
  wides?: number;
  noBalls?: number;
  dots?: number;
  catches?: number;
  manOfMatch?: boolean;
}

export type AvailabilityStatus = 'YES' | 'NO' | 'UNSURE';

export interface PlayerAvailabilityEntry {
  playerId: number;
  playerName: string;
  status?: AvailabilityStatus;
}

export interface MatchPoll {
  pollId?: number;
  matchId: number;
  matchDate?: string;
  homeTeamName?: string;
  oppositionTeamName?: string;
  teamId: number;
  teamName?: string;
  open: boolean;
  availability?: PlayerAvailabilityEntry[];
}

export interface PlayerNotification {
  notificationId: number;
  type: 'POLL_AVAILABLE' | 'TEAM_ANNOUNCED' | 'MANAGER_MESSAGE';
  matchId?: number;
  teamId?: number;
  matchDate?: string;
  homeTeamName?: string;
  oppositionTeamName?: string;
  read: boolean;
  createdAt?: string;
  subject?: string;
  message?: string;
}

export interface MatchSide {
  matchSideId?: number;
  matchId?: number;
  teamId?: number;
  teamName?: string;
  playingXi?: number[];
  twelfthManPlayerId?: number;
  wicketKeeperPlayerId?: number;
  captainPlayerId?: number;
  teamAnnounced?: boolean;
}
