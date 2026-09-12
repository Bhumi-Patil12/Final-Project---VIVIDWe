import { useUser, useSession } from "../auth";
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom"; 


const heroCardClasses = "rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl";
const heroIconClasses = "h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg";
const accentTextClass = "text-fuchsia-600";

export default function CreatorProfile() {
  const { user: loggedInUser } = useUser();
  const { session } = useSession();
  const { userId } = useParams(); 
  const navigate = useNavigate();

  
  const isOwnProfile = !userId || userId === loggedInUser?.id || userId === loggedInUser?.username;


  const [profileData, setProfileData] = useState(null);
  const [profileImage, setProfileImage] = useState("");
  const [showAvatars, setShowAvatars] = useState(false); 
  const [bio, setBio] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [creatorSkill, setCreatorSkill] = useState(""); 
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  //  NEW: Full-Screen Video Modal State
  const [activeFullScreenReel, setActiveFullScreenReel] = useState(null);

  const heroTitle = isOwnProfile ? "My Creator Profile" : "Creator Profile";
  const profileRoleLabel = "Creator";

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const targetIdentifier = userId || loggedInUser?.username || loggedInUser?.primaryEmailAddress?.localPart;

      if (!targetIdentifier) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/profile/${targetIdentifier}`);
        const result = await response.json();

        if (result.success && result.data) {
          setProfileData(result.data);
          setBio(result.data.bio || "");
          setCreatorSkill(result.data.role || "");
          setLocationValue(result.data.location || "");
          setMapUrl(result.data.map_url || "");
          setProfileImage(result.data.profile_image || "/avatars/avatar1.png");
        } else {
          if (isOwnProfile && loggedInUser) {
            setProfileImage(loggedInUser.imageUrl || "");
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, loggedInUser]);

  const getLocation = () => {
    if (!isOwnProfile) return; 
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapUrl(`http://googleusercontent.com/maps.google.com/${lat},${lng}`);

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          setLocationValue(data.display_name || "Location found");
        } catch (error) {
          setLocationValue("Unable to fetch address");
        }
      },
      () => {
        alert("Location access denied");
      }
    );
  };

  const saveProfile = async () => {
    if (!loggedInUser || !session) return;

    if (!bio.trim() || !creatorSkill) {
      alert("Please fill out your bio and choose your specific skill before saving!");
      return;
    }

    setIsSaving(true);
    try {
      const token = await session.getToken();

      const profileSubmitData = {
        username: loggedInUser.username || loggedInUser.primaryEmailAddress?.localPart || "user",
        fullName: loggedInUser.fullName || "",
        email: loggedInUser.primaryEmailAddress?.emailAddress || "",
        bio: bio || "",
        role: creatorSkill || "creator", 
        location: locationValue || "",
        mapUrl: mapUrl || "",
        profileImage: profileImage || "",
        companyName: null,
        companyEmail: null,
        companyWebsite: null,
        hiringMember: null,
        recruiterVerified: false
      };

      const response = await fetch("http://localhost:5000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(profileSubmitData),
      });

      const result = await response.json();

      if (result.success) {
        alert("🎉 Success! Creator profile successfully saved!");
      } else {
        alert("Server validation error: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to connect to the backend pipeline. Make sure your node server is running!");
    } finally {
      setIsSaving(false);
    }
  };
  const handleOpenVideoModal = async (reel) => {
    setActiveFullScreenReel(reel);
    try {
      const response = await fetch(`http://localhost:5000/api/reels/${reel.id}/view`, {
        method: 'PATCH'
      });
      const result = await response.json();
      if (result.success) {
        setProfileData(prev => {
          if (!prev || !prev.reels) return prev;
          return {
            ...prev,
            reels: prev.reels.map(r => r.id === reel.id ? { ...r, views_count: Number(r.views_count || 0) + 1 } : r)
          };
        });
        setActiveFullScreenReel(prev => prev ? { ...prev, views_count: Number(prev.views_count || 0) + 1 } : null);
      }
    } catch (err) {
      console.error("Failed to update profile reel view:", err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading profile details...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-100 to-fuchsia-100 py-8 px-4">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Hero Section */}
        <div className={heroCardClasses}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            
            {/* Left Side: Avatar, Name, Email and Badge */}
            <div className="flex items-center gap-5">
              <div className={`${heroIconClasses} group relative ${isOwnProfile ? 'cursor-pointer' : ''}`}>
                <img
                  src={profileImage || "/avatars/avatar1.png"}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
                {isOwnProfile && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setShowAvatars(true)}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      Edit Avatar
                    </button>
                  </div>
                )}
              </div>
              
              <div>
                <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${accentTextClass}`}>{heroTitle}</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                  {isOwnProfile ? (loggedInUser?.fullName || loggedInUser?.username) : (profileData?.fullName || "Creative Creator")}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {isOwnProfile ? loggedInUser?.primaryEmailAddress?.emailAddress : profileData?.email}
                </p>
                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  {creatorSkill || profileRoleLabel}
                </div>
              </div>
            </div>

            {/* Right Side: Go to Home Button */}
            <div className="lg:self-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
              >
                 Go to Home
              </Link>
            </div>

          </div>
        </div>

        {/* Top Profile Cards Section (Clean 2-Column Row Block) */}
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          {/* Left Column: Bio Box & Email Link */}
          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${accentTextClass}`}>About your profile</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                    {isOwnProfile ? "Describe your creative work" : "Creative Bio"}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{profileRoleLabel}</span>
              </div>
              
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isOwnProfile}
                rows="4"
                placeholder={isOwnProfile ? "Describe your work, style, and the kind of opportunities you're looking for." : "No bio available."}
                className="mt-6 min-h-[160px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 disabled:opacity-90 disabled:cursor-not-allowed"
              />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact Me</p>
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${isOwnProfile ? loggedInUser?.primaryEmailAddress?.emailAddress : profileData?.email || ""}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Contact Creator
              </a>
            </div>
          </div>

          {/* Right Column: Location & Profile Role Dropdown */}
          <div className="space-y-6">
            {/* Location Card */}
            <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl">
              <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${accentTextClass}`}>Location</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">Preferred location</h2>
              
              {isOwnProfile && (
                <button
                  onClick={getLocation}
                  className="mt-5 w-full rounded-3xl bg-gradient-to-r from-cyan-500 to-sky-600 px-5 py-4 text-base font-semibold text-white hover:scale-[1.01] transition"
                >
                  Use current location
                </button>
              )}
              
              <input
                type="text"
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                disabled={!isOwnProfile}
                placeholder="City, state, country"
                className="mt-5 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 disabled:opacity-90"
              />
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700 hover:underline">
                  View location on map
                </a>
              )}
            </div>

            {/* Profile Skill Card */}
            <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl">
              <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${accentTextClass}`}>Profile role</p>
              <select
                value={creatorSkill}
                onChange={(e) => setCreatorSkill(e.target.value)}
                disabled={!isOwnProfile}
                className="mt-4 w-full rounded-2xl border border-slate-200 p-3 bg-white text-slate-900 outline-none border-slate-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-100 disabled:opacity-90"
              >
                <option value="">Select Skill</option>
                <option value="Singer">Singer</option>
                <option value="Dancer">Dancer</option>
                <option value="Actor">Actor</option>
                <option value="Photographer">Photographer</option>
                <option value="Video Editor">Video Editor</option>
                <option value="Graphic Designer">Graphic Designer</option>
                <option value="Writer">Writer</option>
                <option value="Influencer">Influencer</option>
                <option value="Content Creator">Content Creator</option>
              </select>
              <p className="mt-4 text-sm text-slate-600">
                This is the role recruiters see when they discover this profile.
              </p>
            </div>
          </div>
        </section>

        
        {/*  INSTAGRAM PORTFOLIO SECTION: PLACED DOWN SIDE BELOW CARD */}
     
        {profileData?.actualRole === 'creator' && (
          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-xl" style={{ marginTop: '40px' }}>
            
            {/* Instagram Style Posts Navigation Tab header line */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', marginBottom: '24px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#1a202c' }}>
                <span>🎥 Portfolio Videos ({profileData?.reels?.length || 0})</span>
              </div>
            </div>

            {!profileData?.reels || profileData.reels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#718096' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📷</div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>No Posts Yet</h3>
                <p style={{ fontSize: '14px', margin: 0 }}>When this creator shares videos, they will appear here.</p>
              </div>
            ) : (
              /* Instagram 3-Column 1:1 Aspect Ratio Square Feed Layout Grid */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%' }}>
                {profileData.reels.map((reel) => (
                  <div 
                    key={reel.id} 
                    onClick={() => setActiveFullScreenReel(reel)} // 🌟 Open Full Screen on Click
                    style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                    onMouseOver={(e) => {
                      const overlay = e.currentTarget.querySelector('.grid-overlay');
                      if(overlay) overlay.style.opacity = '1';
                    }}
                    onMouseOut={(e) => {
                      const overlay = e.currentTarget.querySelector('.grid-overlay');
                      if(overlay) overlay.style.opacity = '0';
                    }}
                  >
                    {/* HTML5 Native Video Element scaled cleanly inside the 1:1 square wrapper box */}
                    <video 
                      src={reel.video_url} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted
                      loop
                      playsInline
                      onMouseOver={(e) => e.target.play().catch(() => {})}
                      onMouseOut={(e) => e.target.pause()}
                    />
                    
                    {/* Sleek Dark Interaction Hover Mask Overlay displaying total views dynamically */}
                    <div 
                      className="grid-overlay"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '16px', fontWeight: 'bold', opacity: 0, transition: 'opacity 0.2s ease-in-out', pointerEvents: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>▶</span> 
                        <span>{Number(reel.views_count || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avatar Modal */}
        {showAvatars && isOwnProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-[520px] rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Choose Avatar</h2>
                <button
                  onClick={() => setShowAvatars(false)}
                  className="text-2xl font-bold text-slate-500 hover:text-slate-800"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  "/avatars/avatar1.png",
                  "/avatars/avatar2.png",
                  "/avatars/avatar3.png",
                  "/avatars/avatar4.png",
                  "/avatars/avatar5.png",
                  "/avatars/avatar6.png",
                  "/avatars/avatar7.png",
                  "/avatars/avatar8.png",
                ].map((avatar) => (
                  <img
                    key={avatar}
                    src={avatar}
                    alt="avatar"
                    onClick={() => {
                      setProfileImage(avatar);
                      setShowAvatars(false);
                    }}
                    className="h-24 w-24 cursor-pointer rounded-full border-2 border-transparent object-cover hover:border-blue-500"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save Button (Only show if it's your own profile) */}
        {isOwnProfile && (
          <button
            onClick={saveProfile}
            disabled={isSaving}
            className="w-full rounded-[32px] bg-gradient-to-r from-slate-900 via-violet-700 to-fuchsia-600 px-8 py-5 text-xl font-semibold text-white hover:scale-[1.01] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving profile..." : "Save profile"}
          </button>
        )}

        {/* ======================================================== */}
        {/* 📱 INSTAGRAM-STYLE FULL SCREEN VIDEO PLAYER MODAL LAYER  */}
        {/* ======================================================== */}
        {activeFullScreenReel && (
          <div 
            onClick={() => setActiveFullScreenReel(null)} // Closes player on background click
            style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0, 0, 0, 0.95)', display: 'flex', justifyContent: 'center',
              alignItems: 'center', zIndex: 2000, cursor: 'zoom-out'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setActiveFullScreenReel(null)}
              style={{
                position: 'absolute', top: '25px', right: '35px', background: 'transparent',
                border: 'none', color: '#fff', fontSize: '38px', fontWeight: '300',
                cursor: 'pointer', zIndex: 2001, outline: 'none'
              }}
            >
              ×
            </button>

            {/* Central Video Frame Stage */}
            <div 
              onClick={(e) => e.stopPropagation()} // Prevents closing modal when clicking on the video container
              style={{
                width: '100%', maxWidth: '420px', height: '90vh', background: '#000',
                borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 15px 50px rgba(0,0,0,0.6)', position: 'relative', border: '1px solid #111'
              }}
            >
              <video 
                src={activeFullScreenReel.video_url} 
                autoPlay
                controls 
                loop
                playsInline
                onPlay={async () => {
                  try {
                    await fetch(`http://localhost:5000/api/reels/${activeFullScreenReel.id}/view`, {
                      method: 'PATCH'
                    });
                  } catch (err) {
                    console.error("Modal view increase failed:", err);
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />

              {/* Views Count Footer Bar Overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, width: '100%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                padding: '30px 20px 20px 20px', boxSizing: 'border-box', color: '#fff',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#48bb78', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>▶</span>
                  <span>{Number(activeFullScreenReel.views_count || 0).toLocaleString()} views</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}