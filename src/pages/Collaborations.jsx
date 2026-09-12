// src/pages/Collaborations.jsx
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react'; 

export default function Collaborations() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [hasCompletedVerification, setHasCompletedVerification] = useState(false);
  const [checkingDb, setCheckingDb] = useState(true);
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Feed Storage States
  const [opportunities, setOpportunities] = useState([]);

  // 2. Modal Form Field States
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');

  // States for clean Portfolio Application modal handling
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [coverNote, setCoverNote] = useState('');

  const openApplyModal = (oppId) => {
    setSelectedOppId(oppId);
    setCoverNote(''); // Clear out previous note text
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();

    try {
      let token = window.Clerk?.session ? await window.Clerk.session.getToken() : "";
      
      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          opportunityId: selectedOppId, 
          coverNote: coverNote 
        })
      });
      const result = await response.json();

      if (result.success) {
        alert("Application shared successfully! The recruiter can now view your complete portfolio profile.");
        setShowApplyModal(false);
      } else {
        alert("Application failed: " + result.error);
      }
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  // States for handling the floating skill-based leaderboard panel
  const [showLeaderboardPanel, setShowLeaderboardPanel] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  // Auto-fetch/update the leaderboard ranks whenever the search query change updates the target skill!
  useEffect(() => {
    if (!showLeaderboardPanel) return;

    const fetchFilteredLeaderboard = async () => {
      setLoadingLeaders(true);
      try {
        const targetSkill = searchQuery.trim() ? encodeURIComponent(searchQuery) : '';
        const response = await fetch(`http://localhost:5000/api/leaderboard?skill=${targetSkill}`);
        const result = await response.json();
        if (result.success) {
          setLeaderboardData(result.data);
        }
      } catch (err) {
        console.error("Leaderboard component error:", err);
      } finally {
        setLoadingLeaders(false);
      }
    };

    fetchFilteredLeaderboard();
  }, [searchQuery, showLeaderboardPanel]);

  // Function to fetch opportunities feed from backend
  const fetchOpportunities = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/opportunities');
      const result = await response.json();
      if (result.success) {
        setOpportunities(result.data);
      }
    } catch (error) {
      console.error("Error pulling opportunities:", error);
    }
  };

  // Run initialization setup checks
  useEffect(() => {
    async function checkVerificationStatus() {
      if (!isSignedIn || !user) {
        setCheckingDb(false);
        return;
      }
      try {
        const fallbackUsername = user.primaryEmailAddress?.emailAddress?.split('@')[0];
        const userIdentifier = user.username || fallbackUsername;
        
        const response = await fetch(`http://localhost:5000/api/profile/${userIdentifier.toLowerCase().trim()}`);
        const result = await response.json();

        if (result.success && result.data) {
          const currentRole = result.data.actualRole; 
          setUserRole(currentRole);

          const isVerifiedRecruiter = 
            currentRole === 'recruiter' && 
            (result.data.recruiter_verified === 1 || result.data.recruiter_verified === true);
          
          setHasCompletedVerification(isVerifiedRecruiter);
        }
      } catch (error) {
        console.error("Error reading profile role context:", error);
      } finally {
        setCheckingDb(false);
      }
    }

    checkVerificationStatus();
    fetchOpportunities();
  }, [isSignedIn, user]);

  // Form Submission handler with secure Clerk Token handling
  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!title.trim() || !companyName.trim() || !description.trim() || !salary.trim()) {
      alert("Please fill out all fields!");
      return;
    }

    try {
      let token = "";
      if (window.Clerk?.session) {
        token = await window.Clerk.session.getToken();
      }

      const response = await fetch('http://localhost:5000/api/opportunities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title, companyName, description, salary }),
      });
      const result = await response.json();

      if (result.success) {
        alert("Opportunity posted cleanly!");
        setShowModal(false);
        // Reset fields
        setTitle('');
        setCompanyName('');
        setDescription('');
        setSalary('');
        // Reload listings dynamically
        fetchOpportunities();
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit opportunity. Please check console.");
    }
  };

  // Delete Handler Function
  const handleDeleteOpportunity = async (oppId) => {
    if (!window.confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      let token = "";
      if (window.Clerk?.session) {
        token = await window.Clerk.session.getToken();
      }

      const response = await fetch(`http://localhost:5000/api/opportunities/${oppId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        alert("Opportunity removed!");
        fetchOpportunities(); 
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  // Handles fetching and toggling the applicant panel for a specific recruiter card
  const toggleApplicantsDrawer = async (oppId) => {
    const targetOpp = opportunities.find(o => o.id === oppId);
    if (targetOpp && targetOpp.showApplicants) {
      setOpportunities(opportunities.map(o => 
        o.id === oppId ? { ...o, showApplicants: false } : o
      ));
      return;
    }

    try {
      let token = window.Clerk?.session ? await window.Clerk.session.getToken() : "";
      const response = await fetch(`http://localhost:5000/api/opportunities/${oppId}/applicants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();

      if (result.success) {
        setOpportunities(opportunities.map(o => 
          o.id === oppId ? { ...o, applicants: result.data, showApplicants: true } : o
        ));
      } else {
        alert("Failed to load applicants: " + result.error);
      }
    } catch (err) {
      console.error("Error reading drawer records:", err);
    }
  };
  // Helper function to handle full screen view states and record metrics
  const handleOpenVideoModal = async (reel) => {
    setActiveFullScreenReel(reel);

    try {
      // Hit the patch endpoint to increment view count on backend pipeline
      const response = await fetch(`http://localhost:5000/api/reels/${reel.id}/view`, {
        method: 'PATCH'
      });
      const result = await response.json();

      if (result.success) {
        // Update local state instantly so the screen increments live without reload
        setProfileData(prev => {
          if (!prev || !prev.reels) return prev;
          return {
            ...prev,
            reels: prev.reels.map(r => 
              r.id === reel.id ? { ...r, views_count: Number(r.views_count || 0) + 1 } : r
            )
          };
        });

        // Also update the active modal state counter tracking context
        setActiveFullScreenReel(prev => prev ? { ...prev, views_count: Number(prev.views_count || 0) + 1 } : null);
      }
    } catch (err) {
      console.error("Failed to record play metric:", err);
    }
  };

  if (!isLoaded || checkingDb) {
    return <div style={{ color: '#fff', padding: '40px', backgroundColor: '#00122e', minHeight: '100vh' }}>Loading data structures...</div>;
  }

  return (
    <div style={{ padding: '40px', color: '#fff', backgroundColor: '#00122e', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Upper Header Display Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          
          {/* Elegant Back Arrow Button */}
          <button 
            onClick={() => navigate(-1)} 
            style={{
              background: 'rgba(255, 255, 255, 0.05)', color: '#ff5a60', border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', cursor: 'pointer', marginTop: '4px', transition: 'all 0.2s ease-in-out', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#ff5a60'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateX(-3px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#ff5a60'; e.currentTarget.style.transform = 'translateX(0)'; }}
            title="Go Back"
          >
            ←
          </button>

          {/* Typography Content Header Group */}
          <div>
            <h1 style={{ 
              margin: '0 0 6px 0', fontSize: '2.8rem', fontWeight: '800', letterSpacing: '-0.5px',
              background: 'linear-gradient(to right, #ffffff, #e2e8f0)', WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent', fontFamily: 'sans-serif'
            }}>
              Collaborations
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.05rem', fontWeight: '400', letterSpacing: '0.2px' }}>
              Find your next creative project or hire top talent.
            </p>
          </div>
        </div>
        
        {/* Call to Action Controls Tray */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          {/*  LEADERBOARD TOGGLE BUTTON */}
          <button
            onClick={() => setShowLeaderboardPanel(!showLeaderboardPanel)}
            style={{
              background: showLeaderboardPanel ? '#ff5a60' : 'rgba(255, 255, 255, 0.05)', color: '#fff',
              border: showLeaderboardPanel ? 'none' : '1px solid rgba(255, 255, 255, 0.15)', padding: '14px 22px',
              borderRadius: '30px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}
          >
            🏆 {showLeaderboardPanel ? 'Hide Rankings' : 'View Top Rankings'}
          </button>

          {/*  POST OPPORTUNITY TRIGGER BUTTON */}
          <button 
            onClick={() => setShowModal(true)} 
            style={{
              background: 'linear-gradient(135deg, #ff5a60, #e0484e)', color: 'white', border: 'none', 
              padding: '14px 28px', borderRadius: '30px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', 
              boxShadow: '0 4px 15px rgba(255, 90, 96, 0.35)', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            + Post Opportunity
          </button>
        </div> 
      </div> 

      {/*  SEARCH BAR FILTER */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '30px 0 40px 0' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '550px' }}>
          <input
            type="text"
            placeholder="🔍 Search opportunities (e.g., Dancer, Choreographer, Studio)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '30px', border: '1px solid #2d3748',
              background: '#0d1e3d', color: '#fff', fontSize: '15px', outline: 'none',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)', transition: 'all 0.2s ease-in-out', boxSizing: 'border-box'
            }}
            onFocus={(e) => { e.target.style.border = '1px solid #ff5a60'; e.target.style.boxShadow = '0 4px 20px rgba(255, 90, 96, 0.2)'; }}
            onBlur={(e) => { e.target.style.border = '1px solid #2d3748'; e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: '#a0aec0', border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/*  MASTER SPLIT FLEXBOX INTERFACE */}
      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', position: 'relative', width: '100%' }}>
        
        {/* LEFT SIDE: FEED COLUMN */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {(() => {
              const filteredOpportunities = opportunities.filter((opp) => {
                const query = searchQuery.toLowerCase().trim();
                return (
                  opp.title?.toLowerCase().includes(query) ||
                  opp.company_name?.toLowerCase().includes(query) ||
                  opp.description?.toLowerCase().includes(query)
                );
              });

              if (filteredOpportunities.length === 0) {
                return (
                  <p style={{ color: '#a0aec0', gridColumn: '1 / -1', textAlign: 'center', marginTop: '20px' }}>
                    No matches found for "{searchQuery}". Try searching another keyword!
                  </p>
                );
              }

              return filteredOpportunities.map((opp) => (
                <div key={opp.id} style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#333', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
                  <div>
                    <span style={{ background: '#ff5a60', color: 'white', padding: '4px 10px', borderRadius: '12px', float: 'right', fontSize: '12px', fontWeight: 'bold' }}>
                      {opp.status}
                    </span>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1a202c', maxWidth: '80%' }}>{opp.title}</h3>
                    <p style={{ color: '#718096', fontSize: '14px', margin: '0 0 12px 0', fontWeight: '500' }}>{opp.company_name}</p>
                    <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5', margin: 0 }}>{opp.description}</p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: opp.showApplicants ? '1px solid #edf2f7' : 'none', paddingTop: opp.showApplicants ? '15px' : '0' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff5a60', fontSize: '16px' }}>{opp.salary}</div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isSignedIn && user && user.id === opp.clerk_user_id ? (
                        <>
                          <button 
                            onClick={() => toggleApplicantsDrawer(opp.id)}
                            style={{ background: 'rgba(255, 90, 96, 0.1)', color: '#ff5a60', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            {opp.showApplicants ? 'Hide Applicants' : 'View Applicants'}
                          </button>
                          <button 
                            onClick={() => handleDeleteOpportunity(opp.id)}
                            style={{ background: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                            onMouseOver={(e) => { e.target.style.background = '#e53e3e'; e.target.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#e53e3e'; }}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        isSignedIn && userRole === 'creator' && (
                          <button 
                            onClick={() => openApplyModal(opp.id)}
                            style={{ background: 'linear-gradient(135deg, #ff5a60, #e0484e)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255, 90, 96, 0.25)', transition: 'transform 0.15s ease' }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.03)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                          >
                            Apply Now
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {opp.showApplicants && (
                    <div style={{ marginTop: '16px', background: '#f7fafc', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #ff5a60' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#2d3748', fontWeight: 'bold' }}>
                        Applicants Portfolio List ({opp.applicants?.length || 0})
                      </h4>
                      {!opp.applicants || opp.applicants.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '13px', color: '#718096' }}>No creators have applied to this opportunity yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {opp.applicants.map((applicant) => (
                            <div key={applicant.application_id} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#1a202c' }}>
                                  {applicant.full_name} <span style={{ color: '#718096', fontWeight: 'normal', fontSize: '12px' }}>@{applicant.username}</span>
                                </div>
                                <a href={`/profile/${applicant.username}`} target="_blank" rel="noreferrer" style={{ color: '#ff5a60', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}>
                                  View Portfolio →
                                </a>
                              </div>
                              {applicant.cover_note && (
                                <p style={{ margin: 0, fontSize: '13px', color: '#4a5568', background: '#f8fafc', padding: '8px', borderRadius: '6px', fontStyle: 'italic', border: '1px dashed #cbd5e0' }}>
                                  "{applicant.cover_note}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>

        {/* RIGHT SIDE:  FLOATING LEADERBOARD PANEL */}
        {showLeaderboardPanel && (
          <div style={{ width: '380px', background: '#0d1e3d', border: '1px solid #1a2e56', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', position: 'sticky', top: '20px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>
              Top {searchQuery.trim() ? searchQuery : 'Creator'} Ranks
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#a0aec0' }}>
              Ranked dynamically by accumulated platform views.
            </p>

            {loadingLeaders ? (
              <p style={{ color: '#a0aec0', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Analyzing view counts...</p>
            ) : leaderboardData.length === 0 ? (
              <p style={{ color: '#718096', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No creators found with the skill tag "{searchQuery || 'any'}".
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboardData.map((creator, index) => (
                  <div key={creator.clerk_user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', width: '25px' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <img src={creator.profile_image || 'https://via.placeholder.com/32'} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{creator.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#718096' }}>@{creator.username}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#48bb78' }}>
                        {Number(creator.total_views).toLocaleString()} 🔥
                      </div>
                      <a href={`/profile/${creator.username}`} target="_blank" rel="noreferrer" style={{ color: '#ff5a60', fontSize: '11px', textDecoration: 'none', fontWeight: 'bold' }}>
                        View Profile →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div> 

      {/*  PORTFOLIO AUDITION SUBMISSION MODAL POPUP */}
      {showApplyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 }}>
          <form onSubmit={handleApplySubmit} style={{ background: '#fff', color: '#333', padding: '30px', borderRadius: '16px', width: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1a202c', fontSize: '20px', fontWeight: 'bold' }}>
              Apply with Portfolio
            </h3>
            <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.4', marginBottom: '20px' }}>
              Your profile information and live video portfolios will be instantly shared with the recruiter.
            </p>
            
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
              Add a note or introduction (Optional)
            </label>
            <textarea 
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="e.g. Hi! I am a trained contemporary dancer with 3 years of performance experience. Check out my recent reels on my profile page!"
              rows="4"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0', background: '#fff', fontSize: '14px', color: '#333', resize: 'none', marginBottom: '20px', boxSizing: 'border-box', lineHeight: '1.4' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setShowApplyModal(false)} 
                style={{ background: '#edf2f7', color: '#4a5568', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ background: 'linear-gradient(135deg, #ff5a60, #e0484e)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(255, 90, 96, 0.2)' }}
              >
                Share Portfolio
              </button>
            </div>
          </form>
        </div>
      )}

      {/*  POST OPPORTUNITY FORM MODAL CONTAINER */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2100 }}>
          <form onSubmit={handleFormSubmit} style={{ background: '#fff', color: '#333', padding: '30px', borderRadius: '16px', width: '460px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
            
            <h3 style={{ marginTop: 0, fontWeight: 'bold', fontSize: '20px', color: '#1a202c', marginBottom: '6px' }}>
              Post New Opportunity
            </h3>
            <p style={{ fontSize: '13px', color: '#4a5568', marginBottom: '20px', marginTop: 0 }}>
              Fill out the fields below to publish this opportunity to the community feed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#4a5568' }}>Opportunity Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lead Hip-Hop Choreographer"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#4a5568' }}>Company or Studio Name</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Rhythm Edge Studios"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#4a5568' }}>Salary / Compensation</label>
                <input 
                  type="text" 
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. ₹45,000 / Month or Project-based"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#4a5568' }}>Project Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide explicit requirements, audition dates, or project responsibilities..."
                  rows="4"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box', resize: 'none', outline: 'none', fontFamily: 'sans-serif', lineHeight: '1.4' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: '#edf2f7', color: '#4a5568', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{ background: 'linear-gradient(135deg, #ff5a60, #e0484e)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 10px rgba(255, 90, 96, 0.2)' }}
              >
                Publish Job
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}