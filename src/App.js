import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import RsvpPage from "./pages/Rsvp/RsvpPage";
import SummaryPage from "./pages/Summary/SummaryPage";
import "antd/dist/reset.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route redirects to /summary */}
        <Route path="/" element={<Navigate to="/summary" replace />} />

        {/* RSVP page */}
        <Route path="/rsvp/:uniqueId" element={<RsvpPage />} />

        {/* Summary page */}
        <Route path="/summary" element={<SummaryPage />} />
      </Routes>
    </Router>
  );
}

export default App;
