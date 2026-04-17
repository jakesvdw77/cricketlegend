import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ColorModeProvider, useColorMode } from './context/ColorModeContext';
import { lightTheme, darkTheme } from './theme';
import { AppLayout } from './components/layout/AppLayout';
import { useAuth } from './hooks/useAuth';
import keycloak from './keycloak';
import { LandingPage } from './pages/LandingPage';

// Admin pages
import { Tournaments } from './pages/admin/Tournaments';
import { Teams } from './pages/admin/Teams';
import { Players } from './pages/admin/Players';
import { Matches } from './pages/admin/Matches';
import { Teamsheet } from './pages/admin/Teamsheet';
import { Fields } from './pages/admin/Fields';
import { Clubs } from './pages/admin/Clubs';
import { Sponsors } from './pages/admin/Sponsors';
import { Payments } from './pages/admin/Payments';
import { Reports } from './pages/admin/Reports';
import { FundAllocation } from './pages/admin/FundAllocation';
import { TournamentPools } from './pages/admin/TournamentPools';
import { MatchResultCapture } from './pages/admin/MatchResultCapture';
import { MatchAvailabilityManager } from './pages/admin/MatchAvailabilityManager';
import { ManagerTeams } from './pages/admin/ManagerTeams';
import { Managers } from './pages/admin/Managers';
import { MediaLibrary } from './pages/admin/MediaLibrary';
import { SendNotification } from './pages/admin/SendNotification';
import { TournamentView } from './pages/view/TournamentView';
import { TournamentStandings } from './pages/view/TournamentStandings';
import { TournamentResults } from './pages/view/TournamentResults';
import { TournamentSponsors } from './pages/view/TournamentSponsors';

import { MyProfile } from './pages/MyProfile';
import { MyWallet } from './pages/MyWallet';

// View pages
import { PreviousMatches } from './pages/view/PreviousMatches';
import { LiveMatches } from './pages/view/LiveMatches';
import { Scorecards } from './pages/view/Scorecards';
import { PlayerStatistics } from './pages/view/PlayerStatistics';
import { UpcomingMatches } from './pages/view/UpcomingMatches';
import { MatchTeamSheet } from './pages/view/MatchTeamSheet';
import { MatchAvailabilityPoll } from './pages/view/MatchAvailabilityPoll';
import { MyAvailability } from './pages/view/MyAvailability';
import { TeamsView } from './pages/view/TeamsView';

const LandingRoute: React.FC = () => {
  if (keycloak.authenticated) return <Navigate to="/matches/upcoming" replace />;
  return <LandingPage />;
};

const ProtectedLayout: React.FC = () => {
  if (!keycloak.authenticated) return <Navigate to="/" replace />;
  return <AppLayout />;
};

const AdminRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? element : <Navigate to="/matches/upcoming" replace />;
};

const ManagerRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAdmin, isManager } = useAuth();
  return (isAdmin || isManager) ? element : <Navigate to="/matches/upcoming" replace />;
};

function ThemedApp() {
  const { mode } = useColorMode();
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route element={<ProtectedLayout />}>
            <Route path="matches/upcoming" element={<UpcomingMatches />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="my-payments" element={<Navigate to="/my-wallet" replace />} />
            <Route path="my-wallet" element={<MyWallet />} />

            {/* Admin routes */}
            <Route path="admin/clubs" element={<ManagerRoute element={<Clubs />} />} />
            <Route path="admin/teams" element={<ManagerRoute element={<Teams />} />} />
            <Route path="admin/players" element={<ManagerRoute element={<Players />} />} />
            <Route path="admin/tournaments" element={<ManagerRoute element={<Tournaments />} />} />
            <Route path="admin/matches" element={<ManagerRoute element={<Matches />} />} />
            <Route path="admin/media" element={<ManagerRoute element={<MediaLibrary />} />} />
            <Route path="admin/send-notification" element={<ManagerRoute element={<SendNotification />} />} />
            <Route path="admin/matches/:matchId/teamsheet" element={<ManagerRoute element={<Teamsheet />} />} />
            <Route path="admin/matches/:matchId/result" element={<ManagerRoute element={<MatchResultCapture />} />} />
            <Route path="admin/matches/:matchId/availability" element={<ManagerRoute element={<MatchAvailabilityManager />} />} />
            <Route path="admin/fields" element={<ManagerRoute element={<Fields />} />} />
            <Route path="admin/managers" element={<AdminRoute element={<Managers />} />} />
            <Route path="admin/manager-teams" element={<AdminRoute element={<ManagerTeams />} />} />
            <Route path="admin/sponsors" element={<AdminRoute element={<Sponsors />} />} />
            <Route path="admin/payments" element={<AdminRoute element={<Payments />} />} />
            <Route path="admin/reports" element={<AdminRoute element={<Reports />} />} />
            <Route path="admin/fund-allocation" element={<AdminRoute element={<FundAllocation />} />} />
            <Route path="admin/tournaments/:tournamentId/pools" element={<ManagerRoute element={<TournamentPools />} />} />

            {/* View routes (all authenticated users) */}
            <Route path="matches/live" element={<LiveMatches />} />
            <Route path="matches/previous" element={<PreviousMatches />} />
            <Route path="matches/scorecards" element={<Scorecards />} />
            <Route path="player/statistics" element={<PlayerStatistics />} />
            <Route path="matches/:matchId/teamsheet" element={<MatchTeamSheet />} />
            <Route path="poll/:matchId/:teamId" element={<MatchAvailabilityPoll />} />
            <Route path="my-availability" element={<MyAvailability />} />
            <Route path="teams" element={<TeamsView />} />
            <Route path="tournaments" element={<TournamentView />} />
            <Route path="tournaments/:tournamentId/pools" element={<TournamentPools />} />
            <Route path="tournaments/:tournamentId/standings" element={<TournamentStandings />} />
            <Route path="tournaments/:tournamentId/results" element={<TournamentResults />} />
            <Route path="tournaments/:tournamentId/sponsors" element={<TournamentSponsors />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ColorModeProvider>
      <ThemedApp />
    </ColorModeProvider>
  );
}
