import { Link, useNavigate } from "react-router-dom";

export default function ChooseRole() {
  const navigate = useNavigate();


  const handleRoleSelect = (role) => {
    localStorage.setItem("selectedRole", role);
    
   
    navigate(`/signup?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-20">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-12 flex justify-between items-center">
        <Link to="/">
          <button className="border border-gray-300 px-5 py-2 rounded-xl hover:bg-gray-100 transition">
            ← Back to Home
          </button>
        </Link>
        <h1 className="text-2xl font-bold text-blue-600">
          VIVIDWe
        </h1>
      </div>

      {/* HEADING */}
      <div className="text-center mb-20">
        <h1 className="text-6xl font-bold text-gray-900">
          Choose Your Role
        </h1>
        <p className="text-gray-500 text-xl mt-5">
          Continue your journey as creator, recruiter, or viewer.
        </p>
      </div>

      {/* CARDS */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">

        {/* CREATOR CARD */}
        <div className="bg-white border border-gray-200 rounded-3xl p-10 hover:shadow-2xl transition-all flex flex-col">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8">
            ★
          </div>
          <h2 className="text-3xl font-bold mb-5 text-gray-900">
            Creator
          </h2>
          <p className="text-gray-500 leading-7 mb-6">
            Build your portfolio, upload reels and projects,
            grow your audience, and get discovered by recruiters
            looking for top creative talent.
          </p>
          <ul className="space-y-2 text-gray-600 text-sm mb-8">
            <li>• Upload creative content</li>
            <li>• Build your public profile</li>
            <li>• Get collaboration offers</li>
            <li>• Grow your creator ranking</li>
          </ul>
          <button 
            onClick={() => handleRoleSelect("creator")}
            className="w-full mt-auto bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition"
          >
            Continue as Creator
          </button>
        </div>

        {/* RECRUITER CARD */}
        <div className="bg-white border border-gray-200 rounded-3xl p-10 hover:shadow-2xl transition-all flex flex-col">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8">
            🛡
          </div>
          <h2 className="text-3xl font-bold mb-5 text-gray-900">
            Recruiter
          </h2>
          <p className="text-gray-500 leading-7 mb-6">
            Discover skilled creators, browse portfolios,
            and connect with verified talent for projects,
            collaborations, and hiring opportunities.
          </p>
          <ul className="space-y-2 text-gray-600 text-sm mb-8">
            <li>• AI-verified creators</li>
            <li>• Smart talent discovery</li>
            <li>• Send hire requests</li>
            <li>• Manage recruitments</li>
          </ul>
          <button 
            onClick={() => handleRoleSelect("recruiter")}
            className="w-full mt-auto bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition"
          >
            Continue as Recruiter
          </button>
        </div>

        {/* VIEWER CARD */}
        <div className="bg-white border border-gray-200 rounded-3xl p-10 hover:shadow-2xl transition-all flex flex-col">
          <div className="bg-green-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-8">
            ↗
          </div>
          <h2 className="text-3xl font-bold mb-5 text-gray-900">
            Viewer
          </h2>
          <p className="text-gray-500 leading-7 mb-6">
            Explore creator content, follow trending talent,
            interact with creative communities, and discover
            amazing projects from different fields.
          </p>
          <ul className="space-y-2 text-gray-600 text-sm mb-8">
            <li>• Explore creator feeds</li>
            <li>• Follow creators</li>
            <li>• Discover trending content</li>
            <li>• Engage with communities</li>
          </ul>
          <button 
            onClick={() => handleRoleSelect("viewer")}
            className="w-full mt-auto bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 transition"
          >
            Continue as Viewer
          </button>
        </div>

      </div>
    </div>
  );
}