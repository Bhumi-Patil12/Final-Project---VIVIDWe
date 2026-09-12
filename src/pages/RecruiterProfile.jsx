import { useUser, useSession } from "../auth";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom"; 

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mockCompanyAIValidation(name, email) {
  const normalizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = (email.split("@")[1] || "").split(".")[0].toLowerCase();
  return normalizedName.length > 4 && emailPattern.test(email) && (normalizedName.includes(domain) || normalizedName.length > 6);
}

const heroCardClasses = "rounded-[40px] border border-slate-200 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl";
const heroIconClasses = "h-28 w-28 rounded-[28px] border border-slate-200 overflow-hidden shadow-xl group relative cursor-pointer";
const accentTextClass = "text-fuchsia-600";

export default function RecruiterProfile() {
  const { user } = useUser();
  const { session } = useSession();

  const profileRoleLabel = "Recruiter";
  const heroTitle = "Recruiter profile";
  const heroSubtitle = "Manage your hiring profile and verify your company to attract talented creators.";
  const statusText = "Verify company details to boost creator trust.";

  const [profileImage, setProfileImage] = useState(user?.imageUrl || "");
  const [showAvatars, setShowAvatars] = useState(false); 
  const [bio, setBio] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "");
  const [companyEmail, setCompanyEmail] = useState(localStorage.getItem("companyEmail") || "");
  const [companyWebsite, setCompanyWebsite] = useState(localStorage.getItem("companyWebsite") || "");
  const [hiringMember, setHiringMember] = useState(localStorage.getItem("hiringMember") || "");
  const [recruiterVerified, setRecruiterVerified] = useState(localStorage.getItem("recruiterVerified") === "true");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const completionPercent = useMemo(() => {
    let score = 0;
    if (companyName.trim()) score += 1;
    if (emailPattern.test(companyEmail)) score += 1;
    if (companyWebsite.trim()) score += 1;
    if (hiringMember.trim()) score += 1;
    if (bio.trim()) score += 1;
    if (locationValue.trim()) score += 1;
    if (recruiterVerified) score += 1;
    return Math.round((score / 7) * 100);
  }, [companyName, companyEmail, companyWebsite, hiringMember, bio, locationValue, recruiterVerified]);

  const recruiterStatus = useMemo(() => {
    if (completionPercent === 100) return "Verified and complete";
    if (!recruiterVerified) return "Waiting for AI verification";
    return "Details entered, more profile details needed";
  }, [completionPercent, recruiterVerified]);

  useEffect(() => {
    const fetchExistingProfile = async () => {
      if (!user || !session) return;
      try {
        const username = user.username || user.primaryEmailAddress?.localPart || "";
        const response = await fetch(`http://localhost:5000/api/profile/${username}`);
        const result = await response.json();
        if (result.success && result.data) {
          setBio(result.data.bio || "");
          setLocationValue(result.data.location || "");
          setMapUrl(result.data.map_url || "");
          setProfileImage(result.data.profile_image || user.imageUrl || "");
        } else {
          setProfileImage(user.imageUrl || "");
        }
      } catch (error) {
        console.error("Failed to load existing profile:", error);
        setProfileImage(user.imageUrl || "");
      }
    };
    fetchExistingProfile();
  }, [user, session]);

  useEffect(() => {
    localStorage.setItem("companyName", companyName);
    localStorage.setItem("companyEmail", companyEmail);
    localStorage.setItem("companyWebsite", companyWebsite);
    localStorage.setItem("hiringMember", hiringMember);
    localStorage.setItem("recruiterVerified", recruiterVerified ? "true" : "false");
  }, [companyName, companyEmail, companyWebsite, hiringMember, recruiterVerified]);

  const verifyCompanyWithAI = async () => {
    if (!companyName.trim() || !companyEmail.trim() || !hiringMember.trim()) {
      setVerificationMessage("Enter your recruiter details first, then run AI company verification.");
      return;
    }
    setIsVerifying(true);
    setVerificationMessage("");
    await new Promise((resolve) => setTimeout(resolve, 900));
    const valid = mockCompanyAIValidation(companyName, companyEmail);
    setRecruiterVerified(valid);
    localStorage.setItem("recruiterVerified", valid ? "true" : "false");
    setVerificationMessage(valid ? "AI verification succeeded." : "AI verification could not confirm this company.");
    setIsVerifying(false);
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setMapUrl(`http://googleusercontent.com/maps.google.com/${lat},${lng}`);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        setLocationValue(data.display_name || "Location found");
      } catch {
        setLocationValue("Unable to fetch address");
      }
    }, () => alert("Location access denied"));
  };

  const saveProfile = async () => {
    if (!user || !session) return;
    if (!bio.trim()) { alert("Please fill out your bio before saving!"); return; }
    setIsSaving(true);
    try {
      const token = await session.getToken();
      const profileData = {
        username: user.username || user.primaryEmailAddress?.localPart || "user",
        fullName: user.fullName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        bio,
        role: "recruiter",
        location: locationValue,
        mapUrl,
        profileImage,
        companyName,
        companyEmail,
        companyWebsite,
        hiringMember,
        recruiterVerified,
      };
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(profileData),
      });
      const result = await response.json();
      if (result.success) alert("🎉 Success! Recruiter Profile saved!");
      else alert("Server error: " + result.error);
    } catch (error) {
      console.error(error);
    } finally { setIsSaving(false); }
  };

  if (!user) return <div className="text-center py-10">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-100 to-fuchsia-100 py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Hero Section */}
        <div className={heroCardClasses}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            
            {/* Left Side: Avatar & Information */}
            <div className="flex items-center gap-5">
              <div className={heroIconClasses}>
                <img src={profileImage || "/avatars/avatar1.png"} alt="Profile" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => setShowAvatars(true)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900">Edit Avatar</button>
                </div>
              </div>
              <div>
                <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${accentTextClass}`}>{heroTitle}</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">{user?.fullName || user?.username}</h1>
                <p className="mt-2 text-sm text-slate-600">{user?.primaryEmailAddress?.emailAddress}</p>
                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{profileRoleLabel}</div>
              </div>
            </div>

            {/* Right Side: Home Button & Strength Stats */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <Link
                to="/"
                className="w-full sm:w-auto text-center inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
              >
                 Go to Home
              </Link>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 w-full sm:w-auto">
                <div className="rounded-3xl p-5 shadow-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white min-w-[150px]">
                  <p className="text-sm text-slate-200">Strength</p>
                  <p className="mt-2 text-2xl font-semibold">{completionPercent}%</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm min-w-[170px] border border-slate-100">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 truncate">{recruiterStatus}</p>
                </div>
              </div>
            </div>

          </div>
          <p className="mt-8 text-slate-600 max-w-2xl">{heroSubtitle}</p>
        </div>

        {/* Company and Summary Grid */}
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Company details</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">Recruiter account</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${recruiterVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{recruiterVerified ? "Verified" : "Needs verification"}</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" className="mt-2 w-full rounded-xl border border-slate-200 p-3 bg-white" />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Email</label>
                <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="Enter company email" className="mt-2 w-full rounded-xl border border-slate-200 p-3 bg-white" />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Website</label>
                <input type="text" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://yourcompany.com" className="mt-2 w-full rounded-xl border border-slate-200 p-3 bg-white" />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hiring Manager</label>
                <input type="text" value={hiringMember} onChange={(e) => setHiringMember(e.target.value)} placeholder="Hiring manager name" className="mt-2 w-full rounded-xl border border-slate-200 p-3 bg-white" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button type="button" onClick={verifyCompanyWithAI} disabled={isVerifying} className="w-full rounded-3xl bg-gradient-to-r from-slate-900 via-violet-700 to-fuchsia-600 px-6 py-4 text-base font-semibold text-white hover:scale-[1.01] transition disabled:opacity-70">{isVerifying ? "Verifying..." : "Verify company with AI"}</button>
              {verificationMessage && <div className={`rounded-3xl border px-5 py-4 text-sm ${recruiterVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{verificationMessage}</div>}
            </div>
          </section>

          <section className="rounded-[40px] border border-slate-200 bg-gradient-to-br from-slate-50 via-cyan-50 to-white p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-slate-900">Recruiter profile summary</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="mt-2 text-lg font-semibold text-slate-900">{completionPercent}% complete</p></div>
            </div>
          </section>
        </div>

        {/* Bio & Location */}
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-slate-900">Tell creators who you are</h2>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows="4" placeholder="Describe your hiring needs..." className="mt-6 min-h-[160px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100" />
          </div>

          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-slate-900">Office location</h2>
            <button type="button" onClick={getLocation} className="mt-5 w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-600 px-5 py-4 text-white font-semibold">Use current location</button>
            <input type="text" value={locationValue} onChange={(e) => setLocationValue(e.target.value)} placeholder="City, state, country" className="mt-5 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none" />
          </div>
        </section>

        {/* Avatar Modal */}
        {showAvatars && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[520px] rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Choose Avatar</h2><button onClick={() => setShowAvatars(false)} className="text-2xl font-bold">×</button></div>
              <div className="grid grid-cols-4 gap-4">
                {["/avatars/avatar1.png", "/avatars/avatar2.png", "/avatars/avatar3.png", "/avatars/avatar4.png", "/avatars/avatar5.png", "/avatars/avatar6.png", "/avatars/avatar7.png", "/avatars/avatar8.png"].map((avatar) => (
                  <img key={avatar} src={avatar} alt="avatar" onClick={() => { setProfileImage(avatar); setShowAvatars(false); }} className="h-24 w-24 cursor-pointer rounded-full border-2 border-transparent hover:border-blue-500 object-cover" />
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={saveProfile} disabled={isSaving} className="w-full rounded-[32px] bg-gradient-to-r from-slate-900 via-violet-700 to-fuchsia-600 px-8 py-5 text-xl font-semibold text-white">{isSaving ? "Saving..." : "Save recruiter profile"}</button>
      </div>
    </div>
  );
}