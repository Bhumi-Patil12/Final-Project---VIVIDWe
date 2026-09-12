import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react"; 
import { useNavigate } from 'react-router-dom';

export default function Reels() {
  const [reels, setReels] = useState([]);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [description, setDescription] = useState("");
  
  
  const fileInputRef = useRef(null);
  const { getToken } = useAuth();

  const fetchReelsFromDb = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/reels-feed");
      const result = await response.json();
      if (result.success) {
        setReels(result.data); 
      }
    } catch (error) {
      console.error("Error fetching reels from MySQL:", error);
    }
  };

  useEffect(() => {
    fetchReelsFromDb();
  }, []);


  const handleHeaderFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);

    try {
      const token = await getToken();
      alert("Uploading video from gallery...");

      const response = await fetch("http://localhost:5000/api/upload-reel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        alert("🎉 Reel successfully saved to Local Storage & MySQL!");
        fetchReelsFromDb(); // Refresh the list automatically
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error connecting to local backend.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 🛠️ HIDDEN SYSTEM FILE PICKER (For accessing mobile/desktop gallery) */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="video/*"
        onChange={handleHeaderFileUpload}
      />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <nav className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link to="/" className="text-2xl font-bold tracking-tight text-cyan-300 hover:text-white transition">
              VIVIDWe Reels
            </Link>
            <p className="mt-2 text-sm text-slate-400">Browse creator reels or add your own demo reel instantly.</p>
          </div>
          {/* Replace your text links with this beautifully styled container block */}
<div style={{ 
  display: 'flex', 
  gap: '12px', 
  alignItems: 'center', 
  fontFamily: 'sans-serif' 
}}>
  
  {/* 1. Styled Hiring Button */}
  <a href="/collaborations" style={{
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid #ffffff',
    padding: '8px 18px',
    borderRadius: '20px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}
  onMouseOver={(e) => { e.target.style.background = '#ffffff'; e.target.style.color = '#000c1f'; }}
  onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ffffff'; }}
  >
    Hiring
  </a>

  {/* 2. Styled Home Button */}
  <a href="/" style={{
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid #ffffff',
    padding: '8px 18px',
    borderRadius: '20px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}
  onMouseOver={(e) => { e.target.style.background = '#ffffff'; e.target.style.color = '#000c1f'; }}
  onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ffffff'; }}
  >
    Home
  </a>
  
</div>
        </nav>

        <header className="mt-10 rounded-[32px] border border-cyan-500/20 bg-slate-900/80 p-10 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-400">Creator showcase</p>
              <h1 className="mt-4 text-5xl font-bold text-white">Explore creator reels in one place.</h1>
              <p className="mt-6 max-w-2xl leading-8 text-slate-300">
                Discover demo reels shared by creators, add your own visual story, and build a gallery of stunning creative work.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {/* 🚀 FIXED: "Add your first reel" ab click hote hi gallery kholega! */}
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
                >
                  Add your reel
                </button>
              <Link 
  to="/reels/feed" 
  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-transparent px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-600 transition"
>
  Jump to reel feed
</Link>
              </div>
            </div>
            
            {/* Displaying preview of latest 2 reels */}
            <div className="grid gap-4 sm:grid-cols-2">
              {reels.slice(0, 2).map((reel) => (
                <div key={reel.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
                  <video
                    src={reel.video_url || reel.videoUrl}
                    controls
                    className="h-48 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="mt-10 grid gap-10 lg:grid-cols-2">
  {/* 1. Left Side: Direct Upload Panel */}
  <section className="space-y-6 rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-500/10">
    <div>
      <p className="text-sm uppercase tracking-[0.32em] text-cyan-400">Your reel studio</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Direct Upload Powered System</h2>
      <p className="mt-3 text-slate-400">
        Click on the <strong className="text-cyan-400">"Add your reel"</strong> button above to instantly choose a video from your gallery. 
      </p>
    </div>
  </section>

  {/* 2. Right Side: New Jump to Feed Panel */}
  <section className="space-y-6 rounded-[32px] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-500/10">
    <div>
      <p className="text-sm uppercase tracking-[0.32em] text-cyan-400">Reel Feed</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Immersive Viewer System</h2>
      <p className="mt-3 text-slate-400">
        Click on the <strong className="text-cyan-400">"Jump to reel feed"</strong> button above to browse, scroll, and explore creative reels seamlessly.
      </p>
    </div>
  </section>
</main>
      </div>
    </div>
  );
}