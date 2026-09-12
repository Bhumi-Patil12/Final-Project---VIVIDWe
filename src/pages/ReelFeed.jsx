import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom"; // Added Link

const ReelFeed = () => {
  const [reels, setReels] = useState([]);
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/reels-feed"); 
        const json = await response.json();
        
        if (json.success && Array.isArray(json.data)) {
          const formattedData = json.data.map(reel => ({
            ...reel,
            isLiked: false, 
            likesCount: Number(reel.likes_count) || 0, 
            viewsCount: Number(reel.views_count) || 0  
          }));
          setReels(formattedData);
        } else {
          setReels([]);
        }
      } catch (error) {
        console.error("Error fetching reels:", error);
        setReels([]);
      }
    };
    fetchReels();
  }, []);


  const handleDelete = async (id) => {
    try {
      const token = await getToken();

      const response = await fetch(`http://localhost:5000/api/delete-reel/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setReels(reels.filter((reel) => reel.id !== id));
        alert("Reel deleted successfully!");
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error("Error deleting reel:", error);
    }
  };

  
  const handleLikeToggle = async (id) => {
    try {
      // Optimistic layout update for instantaneous UI clicks
      setReels(prev => prev.map(reel => {
        if (reel.id === id) {
          return {
            ...reel,
            isLiked: !reel.isLiked,
            likesCount: reel.isLiked ? reel.likesCount - 1 : reel.likesCount + 1
          };
        }
        return reel;
      }));

      // Fire payload to backend without hitting Clerk blocking walls
      await fetch(`http://localhost:5000/api/reels/${id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentUserId: userId }) // Pass the active clerk user id
      });
    } catch (error) {
      console.error("Error updating like status:", error);
    }
  };
 
  const handleVideoEnded = async (id) => {
    try {
      setReels(prev => prev.map(reel => {
        if (reel.id === id) {
          return { ...reel, viewsCount: reel.viewsCount + 1 };
        }
        return reel;
      }));

      await fetch(`http://localhost:5000/api/reels/${id}/view`, {
        method: "POST"
      });
    } catch (error) {
      console.error("Error updating views tracking:", error);
    }
  };

  return (
    <div style={styles.feedPage}>
      <div style={styles.header}>
        <button onClick={() => navigate("/reels")} style={styles.backBtn}>
          ← Back to Studio
        </button>
        <h3 style={{ margin: 0 }}>Reels Feed</h3>
        <div style={{ width: "80px" }}></div>
      </div>

      <div style={styles.reelsContainer}>
        {reels.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: "40px", color: "#cbd5e1" }}>
            No reels found. Upload some from the studio!
          </p>
        ) : (
          reels.map((reel) => (
            <div key={reel.id} style={styles.reelCard}>
              
              <video
                src={reel.video_url} 
                controls
                loop
                onEnded={() => handleVideoEnded(reel.id)}
                style={styles.videoPlayer}
              />

              {/* Right Side Interaction Panel */}
              <div style={styles.rightActionsBar}>
                <div style={styles.actionItem}>
                  <button 
                    onClick={() => handleLikeToggle(reel.id)} 
                    style={{
                      ...styles.actionButton,
                      color: reel.isLiked ? "#ef4444" : "#fff",
                    }}
                  >
                    {reel.isLiked ? "❤️" : "🤍"}
                  </button>
                  <span style={styles.actionText}>{reel.likesCount}</span>
                </div>

                <div style={styles.actionItem}>
                  <div style={{ fontSize: "24px" }}>🔥</div>
                  <span style={styles.actionText}>{reel.viewsCount}</span>
                </div>
              </div>

              {/* Layout Content Overlay */}
              <div style={styles.overlay}>
                <div style={styles.profileRow}>
                  <Link 
      to={`/profile/${reel.username || reel.clerk_user_id}`} 
      style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
    >
      {reel.profile_image ? (
        <img src={reel.profile_image} alt="avatar" style={styles.avatar} />
      ) : (
        <div style={styles.defaultAvatar}>👤</div>
      )}
      
      <span style={styles.profileName}>
        {reel.full_name || `@user_${reel.clerk_user_id?.substring(0, 8)}...`}
      </span>
    </Link>
                  {reel.location && (
                    <span style={styles.locationTag}>
                      📍 {reel.location}
                    </span>
                  )}
                </div>
                <h4 style={{ margin: "5px 0 0 0", fontWeight: "normal", fontSize: "15px" }}>
                  {reel.title || "Exploring creation profiles..."}
                </h4>
              </div>

              {reel.clerk_user_id === userId && (
                <button onClick={() => handleDelete(reel.id)} style={styles.deleteBtn}>
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  feedPage: { backgroundColor: "#0b111e", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", color: "#fff", fontFamily: "sans-serif" },
  header: { width: "100%", maxWidth: "500px", padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e293b", boxSizing: "border-box" },
  backBtn: { background: "none", border: "none", color: "#00bcd4", cursor: "pointer", fontSize: "16px", fontWeight: "bold" },
  reelsContainer: { width: "100%", maxWidth: "450px", height: "calc(100vh - 60px)", overflowY: "scroll", scrollSnapType: "y mandatory", scrollbarWidth: "none" },
  reelCard: { width: "100%", height: "calc(100vh - 60px)", scrollSnapAlign: "start", position: "relative", background: "#000", display: "flex", justifyContent: "center", alignItems: "center" },
  videoPlayer: { width: "100%", height: "100%", objectFit: "cover" },
  overlay: { position: "absolute", bottom: "40px", left: "20px", right: "75px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "15px", borderRadius: "8px", zIndex: 5 },
  deleteBtn: { position: "absolute", right: "15px", top: "15px", backgroundColor: "rgba(239, 68, 68, 0.85)", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "20px", cursor: "pointer", zIndex: 10, fontSize: "13px" },
  profileRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  avatar: { width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #fff", objectFit: "cover" },
  defaultAvatar: { width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#1e293b", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "16px", border: "1px solid #475569" },
  profileName: { fontWeight: "bold", fontSize: "15px", color: "#fff" },
  locationTag: { fontSize: "12px", backgroundColor: "rgba(255, 255, 255, 0.2)", padding: "2px 8px", borderRadius: "12px", color: "#e2e8f0" },
  rightActionsBar: { position: "absolute", right: "15px", bottom: "120px", display: "flex", flexDirection: "column", gap: "20px", zIndex: 10, alignItems: "center" },
  actionItem: { display: "flex", flexDirection: "column", alignItems: "center" },
  actionButton: { background: "rgba(0, 0, 0, 0.45)", border: "none", borderRadius: "50%", width: "45px", height: "45px", fontSize: "22px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "transform 0.1s ease" },
  actionText: { fontSize: "12px", marginTop: "4px", color: "#fff", fontWeight: "bold" }
};

export default ReelFeed;