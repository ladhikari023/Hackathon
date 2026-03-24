import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import MoodPage from "./pages/MoodPage";
import CommunityPage from "./pages/CommunityPage";
import TherapistsPage from "./pages/TherapistsPage";
import AdminPage from "./pages/AdminPage";
import PatientInsightsPage from "./pages/PatientInsightsPage";
import PeerMatchPage from "./pages/PeerMatchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/mood" element={<MoodPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/therapists" element={<TherapistsPage />} />
          <Route path="/peers" element={<PeerMatchPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/patient-insights" element={<PatientInsightsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
