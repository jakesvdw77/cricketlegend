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

export type MatchStage = 'FRIENDLY' | 'POOL' | 'PLAYOFFS' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL';
export type TossWinner = 'HOME' | 'OPPOSITION';
export type TossDecision = 'BAT' | 'BOWL';
export type ResultVisibility = 'NOT_PUBLISHED' | 'SUMMARY_ONLY' | 'SCORECARD_AND_SUMMARY';

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
  vatInclusive?: boolean;
  status?: PaymentStatus;
  description?: string;
  rejectionReason?: string;
  proofOfPaymentUrl?: string;
  createdAt?: string;
}

export interface PagedPaymentResponse {
  content: Payment[];
  totalElements: number;
  totalPages: number;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
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
  matchId?: number;
  matchLabel?: string;
  tournamentId?: number;
  tournamentName?: string;
  subscriptionYear?: number;
}

export interface PagedAllocationResponse {
  content: WalletAllocationDTO[];
  totalElements: number;
  totalPages: number;
  total: number;
}

export interface AllocationResultDTO {
  allocated: { playerId: number; playerName: string; amount: number }[];
  skipped: { playerId: number; playerName: string; reason: string; walletBalance: number; required: number }[];
}

export interface TournamentFeePlayerDataDTO {
  playerId: number;
  playerName: string;
  walletBalance: number;
  tournamentPaymentCount: number;
  tournamentPaymentTotal: number;
  tournamentFeeAllocated: number;
  teamId?: number;
  teamName?: string;
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
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
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
  consentEmail?: boolean;
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
  instagramUrl?: string;
  youtubeUrl?: string;
  mediaContent?: MediaContent[];
  sponsors?: Sponsor[];
}

export interface TournamentTeam {
  tournamentTeamId?: number;
  poolId?: number;
  teamId?: number;
  teamName?: string;
  abbreviation?: string;
  logoUrl?: string;
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
  instagramLink?: string;
  youtubeLink?: string;
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
  showOnFrontPage?: boolean;
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
  homeTeamPlaceholder?: string;
  awayTeamPlaceholder?: string;
  tossWonBy?: TossWinner;
  tossDecision?: TossDecision;
  homeTeamId?: number;
  homeTeamName?: string;
  homeTeamAbbreviation?: string;
  homeTeamLogoUrl?: string;
  oppositionTeamId?: number;
  oppositionTeamName?: string;
  oppositionTeamAbbreviation?: string;
  oppositionTeamLogoUrl?: string;
  fieldId?: number;
  fieldName?: string;
  fieldAddress?: string;
  fieldIconUrl?: string;
  fieldGoogleMapsUrl?: string;
  scoringUrl?: string;
  youtubeUrl?: string;
  tournamentId?: number;
  tournamentName?: string;
  matchCompleted?: boolean;
  matchDrawn?: boolean;
  forfeited?: boolean;
  noResult?: boolean;
  matchOutcomeDescription?: string;
  scoreBattingFirst?: number;
  wicketsLostBattingFirst?: number;
  oversBattingFirst?: string;
  scoreBattingSecond?: number;
  wicketsLostBattingSecond?: number;
  oversBattingSecond?: string;
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
  dismissedFielder?: string;
  dismissedDescription?: string;
  topPerformer?: boolean;
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
  topPerformer?: boolean;
}

export interface TeamScorecard {
  teamId?: number;
  score?: number;
  wickets?: number;
  overs?: string;
  byes?: number;
  legByes?: number;
  wides?: number;
  noBalls?: number;
  penaltyRuns?: number;
  batting?: BattingEntry[];
  bowling?: BowlingEntry[];
}

export interface ScorecardData {
  teamA?: TeamScorecard;
  teamB?: TeamScorecard;
}

export type PlayerMatchStatus = 'MATCHED' | 'SUGGESTED' | 'UNMATCHED';

export interface PlayerMatchResult {
  name: string;
  team: 'teamA' | 'teamB';
  status: PlayerMatchStatus;
  matchedPlayerId?: number;
  suggestedName?: string;
  suggestedPlayerId?: number;
  confidence: number;
}

export interface ScorecardImageImportResponse {
  scorecard: ScorecardData;
  playerMatches: PlayerMatchResult[];
}

export interface MatchResultSummary {
  matchId: number;
  tournamentId?: number;
  matchDate?: string;
  homeTeamName?: string;
  oppositionTeamName?: string;
  fieldName?: string;
  scoringUrl?: string;
  youtubeUrl?: string;
  sideBattingFirstName?: string;
  scoreBattingFirst?: number;
  wicketsLostBattingFirst?: number;
  oversBattingFirst?: string;
  scoreBattingSecond?: number;
  wicketsLostBattingSecond?: number;
  oversBattingSecond?: string;
  matchDrawn?: boolean;
  decidedOnDLS?: boolean;
  decidedBySuperOver?: boolean;
  wonWithBonusPoint?: boolean;
  winningTeamName?: string;
  manOfTheMatchName?: string;
  matchOutcomeDescription?: string;
}

export interface PoolStandingEntry {
  teamId: number;
  teamName: string;
  abbreviation?: string;
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
  forfeited?: boolean;
  noResult?: boolean;
  decidedOnDLS?: boolean;
  decidedBySuperOver?: boolean;
  wonWithBonusPoint?: boolean;
  winningTeamId?: number;
  winningTeamName?: string;
  manOfTheMatchId?: number;
  manOfTheMatchName?: string;
  tossWonBy?: TossWinner;
  tossDecision?: TossDecision;
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
  resultVisibility?: ResultVisibility;
}

export interface AiTeamPick {
  generatedAt?: string;
  selectionRationale: string;
  bowlingRotation: string;
  fairnessNote: string | null;
  selectedXi: Array<{
    name: string;
    battingPosition: number | null;
    role: 'BAT' | 'BOWL' | 'AR' | 'WK';
    selectionReason: string;
  }>;
  twelfthMan: {
    name: string;
    battingPosition: null;
    role: 'BAT' | 'BOWL' | 'AR' | 'WK';
    selectionReason: string;
  } | null;
  resolvedXiPlayerIds: number[];
  resolvedTwelfthManId: number | null;
  chartData: {
    availabilitySummary: Array<{ label: string; count: number }>;
    tournamentAppearances: Array<{ player: string; matches: number; selected: boolean }>;
  };
}

export interface XiAnalysis {
  generatedAt?: string;
  xiSummary: string;
  battingOrderSuggestion: string;
  bowlingPlanSuggestion: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  chartData: {
    xiStrengthRadar: Array<{ skill: string; score: number | null }>;
    battingPositionBreakdown: Array<{ label: string; count: number }>;
    bowlingVariety: Array<{ label: string; count: number }>;
    playerRoles: Array<{
      name: string;
      battingPosition: number | null;
      role: 'BAT' | 'BOWL' | 'AR' | 'WK';
      rating: number | null;
      keyContribution: string;
    }>;
  };
}

export interface TournamentStatsReport {
  generatedAt?: string;
  summary: string;
  battingAnalysis: string;
  bowlingAnalysis: string;
  extrasAnalysis: string;
  keyPerformers: string[];
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  overallRating: number;
}

export interface PlayerStatsReport {
  generatedAt?: string;
  summary: string;
  battingAnalysis: string;
  bowlingAnalysis: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  playerRating: number;
}

export interface SquadAnalysis {
  generatedAt?: string;
  squadSummary: string;
  balanceVerdict: string;
  strengths: string[];
  weaknesses: string[];
  selectionRecommendations: string[];
  keyPlayers: Array<{
    name: string;
    primaryRole: 'BAT' | 'BOWL' | 'WK' | 'AR';
    keySkill: string;
    rating: number | null;
    isKeyPlayer: boolean;
  }>;
  chartData: {
    squadStrengthRadar: Array<{ skill: string; score: number | null }>;
    roleDistribution: Array<{ label: string; count: number }>;
    bowlingVariety: Array<{ label: string; count: number }>;
    battingDepth: Array<{ label: string; count: number }>;
    playerProfiles: Array<{
      name: string;
      primaryRole: 'BAT' | 'BOWL' | 'WK' | 'AR';
      rating: number | null;
      keySkill: string;
      isKeyPlayer: boolean;
    }>;
  };
}

export interface MatchAnalysis {
  generatedAt?: string;
  matchSummary: string;
  teamPerformance: {
    battingRating: number;
    bowlingRating: number;
    overallRating: number;
    verdict: string;
  };
  keyInsights: string[];
  playerHighlights: Array<{
    name: string;
    role: 'BAT' | 'BOWL';
    achievement: string;
    isStandout: boolean;
  }>;
  recommendations: string[];
  chartData: {
    battingContributions: Array<{
      player: string;
      runs: number;
      balls: number;
      strikeRate: number;
      fours: number;
      sixes: number;
      isTopPerformer: boolean;
    }>;
    bowlingAnalysis: Array<{
      player: string;
      overs: number;
      runs: number;
      wickets: number;
      economy: number;
      maidens: number;
      isTopPerformer: boolean;
    }>;
    dismissalBreakdown: Array<{ type: string; count: number }>;
    teamComparison: {
      myTeam: { name: string; runs: number; wickets: number; overs: string; runRate: number };
      opposition: { name: string; runs: number; wickets: number; overs: string; runRate: number };
    };
  };
}

export interface MatchSummary {
  generatedAt?: string;
  narrative: string;
  matchVerdict: string;
  keyMoments: string[];
  teamSummaries: Array<{
    teamName: string;
    innings: { runs: number; wickets: number; overs: string; runRate: number };
    battingSummary: string;
    bowlingSummary: string;
    notablePlayers: Array<{ name: string; role: 'BAT' | 'BOWL'; contribution: string }>;
  }>;
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
  profilePictureUrl?: string;
}

export interface MatchPoll {
  pollId?: number;
  matchId: number;
  matchDate?: string;
  scheduledStartTime?: string;
  arrivalTime?: string;
  homeTeamName?: string;
  oppositionTeamName?: string;
  homeTeamLogoUrl?: string;
  oppositionTeamLogoUrl?: string;
  fieldName?: string;
  fieldAddress?: string;
  fieldGoogleMapsUrl?: string;
  fieldIconUrl?: string;
  tournamentName?: string;
  matchStage?: string;
  umpire?: string;
  teamId: number;
  teamName?: string;
  open: boolean;
  availability?: PlayerAvailabilityEntry[];
}

export interface PlayerNotification {
  notificationId: number;
  type: 'POLL_AVAILABLE' | 'TEAM_ANNOUNCED' | 'MANAGER_MESSAGE' | 'CLUB_EVENT';
  matchId?: number;
  teamId?: number;
  eventId?: number;
  matchDate?: string;
  homeTeamName?: string;
  oppositionTeamName?: string;
  read: boolean;
  createdAt?: string;
  subject?: string;
  message?: string;
  availabilityStatus?: AvailabilityStatus;
}

export type EventCategory = 'TEAM_PRACTISE' | 'AWARD_CEREMONY' | 'CAPPING_CEREMONY' | 'TEAM_MEETING';
export type RecurrenceType = 'NONE' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

export interface ClubEvent {
  eventId?: number;
  clubId: number;
  clubName?: string;
  teamId?: number;
  teamName?: string;
  category: EventCategory;
  title?: string;
  notes?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  googleMapsUrl?: string;
  meetingUrl?: string;
  recurrence?: RecurrenceType;
  recurrenceEndDate?: string;
  seriesId?: number;
  createdByName?: string;
}

export interface SocialMediaPage {
  id?: number;
  url: string;
  label?: string;
  enabled: boolean;
}

export interface AppSettings {
  showUpcomingSection: boolean;
  showLiveMatchesSection: boolean;
  showLogStandingsSection: boolean;
  showMatchResultsSection: boolean;
}

export interface MailSettings {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
}

export interface AiSettings {
  apiKey: string;
  defaultModel: string;
}

export interface MatchFeePlayerDataDTO {
  playerId: number;
  playerName: string;
  walletBalance: number;
  tournamentPaymentCount: number;
  tournamentPaymentTotal: number;
  matchFeeAllocated: number;
  matchSideId: number;
  teamName: string;
}

export interface ManagerTeamDTO {
  id: number;
  managerId: number;
  managerDisplayName: string;
  managerEmail: string;
  teamId: number;
  teamName: string;
}

export interface UserLoginEvent {
  loginEventId: number;
  firstName: string;
  lastName: string;
  role: string;
  loginTime: string;
}

export interface PagedLoginEventResponse {
  content: UserLoginEvent[];
  totalElements: number;
  totalPages: number;
}

export type MatchPlayerRole = 'BATSMAN' | 'ALL_ROUNDER' | 'BOWLER';

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
  playerRoles?: Record<number, MatchPlayerRole>;
}
