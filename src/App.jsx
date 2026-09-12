import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ChooseRole from "./pages/ChooseRole";
import CreatorProfile from "./pages/CreatorProfile";
import RecruiterProfile from "./pages/RecruiterProfile"; 
import ViewerProfile from "./pages/ViewerProfile";       
import Reels from "./pages/Reels";
import ReelFeed from './pages/ReelFeed';
import DashboardWrapper from "./pages/DashBoardWrapper";
import Collaborations from './pages/Collaborations';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/choose-role" element={<ChooseRole />} />
        
        <Route path="/dashboard" element={<DashboardWrapper />} />
        
        {/* profiles of three roles */}
        <Route path="/creator-profile" element={<CreatorProfile />} />
        <Route path="/recruiter-profile" element={<RecruiterProfile />} />
        <Route path="/viewer-profile" element={<ViewerProfile />} />
        
        {/* FIX: Handles the dynamic profile link */}
        <Route path="/profile/:userId" element={<CreatorProfile />} />
        
        <Route path="/reels" element={<Reels />} />
        <Route path="/reels/feed" element={<ReelFeed />} />
        <Route path="/collaborations" element={<Collaborations />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;