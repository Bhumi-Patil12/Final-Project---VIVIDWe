import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware, getAuth } from '@clerk/express';
import mysql from 'mysql2/promise'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize app first!
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Apply your updated CORS config right under it
app.use(cors({ 
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // Enforces header permissions for Clerk JWT tokens
  credentials: true
})); 

app.use(express.json()); 

//  STATIC ROUTE: Expose the uploads folder so frontend can access video streams
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Core Authentication Middleware (Clerk standard)
app.use(clerkMiddleware());

// Setup a Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});



// 🛠️ MULTER CONFIGURATION FOR LOCAL VIDEO STORAGE
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `reel-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB Max
});


// ROUTE 1: UPLOAD REEL TO LOCAL + MYSQL

app.post('/api/upload-reel', upload.single('video'), async (req, res) => {
  try {
    const { userId } = getAuth(req); 

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized! Please login first." });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No video file uploaded." });
    }

    const videoUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

    // FORCE EXPLICIT INITIALIZATION VALUE WRITING
    const sqlQuery = `INSERT INTO reels (clerk_user_id, video_url, likes_count, views_count) VALUES (?, ?, 0, 0)`;
    await pool.execute(sqlQuery, [userId, videoUrl]);

    return res.status(200).json({ 
      success: true, 
      message: "Reel uploaded and saved locally successfully!", 
      videoUrl 
    });

  } catch (error) {
    console.error("Reel Upload Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});


//  ROUTE 2: FETCH ALL REELS FOR THE FEED

app.get('/api/reels-feed', async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, 
        r.video_url, 
        r.clerk_user_id,
        r.created_at,
        r.likes_count,   
        r.views_count,
        cp.username,   
        cp.full_name,
        cp.location,
        cp.profile_image
      FROM reels r
      LEFT JOIN creator_profiles cp ON r.clerk_user_id = cp.clerk_user_id
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await pool.execute(query);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Reels Feed Fetch Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});



//  ROUTE 3: SECURE DELETE REEL

app.delete('/api/delete-reel/:id', async (req, res) => {
  try {
    const { userId } = getAuth(req); 
    
    if (!userId) {
      return res.status(401).json({ success: false, error: "Login status checking failed!" });
    }

    const { id } = req.params;
    console.log(`[DEBUG] Attempting delete for Reel ID: ${id} by User: ${userId}`);

    // 1. MySQL Check
    const [rows] = await pool.execute('SELECT * FROM reels WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Reel database mein nahi mili!" });
    }

    const reel = rows[0];

    // 2. Authorization check
    if (reel.clerk_user_id !== userId) {
      return res.status(403).json({ success: false, error: "Tum kisi aur ki reel delete nahi kar sakte!" });
    }

    // 3. File deletion logic
    try {
      const filename = reel.video_url.split('/uploads/')[1];
      const localFilePath = path.resolve(__dirname, 'uploads', filename);

      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        console.log(`[DEBUG] File scrubbed from local storage: ${localFilePath}`);
      }
    } catch (fsErr) {
      console.error("[DEBUG] FS error, proceeding to clear DB anyway:", fsErr.message);
    }

    // 4. Clear from DB
    await pool.execute('DELETE FROM reels WHERE id = ?', [id]);
    console.log(`[DEBUG] Reel row ID ${id} deleted successfully from MySQL.`);

    return res.status(200).json({ success: true, message: "Deleted successfully!" });

  } catch (error) {
    console.error("Delete Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});



//  ROUTE 4: THE SAVE PROFILE ROUTE (FIXED SCHEMA ORDER)

app.post('/api/profile', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const username = req.body.username;
    const fullName = req.body.fullName || null;
    const email = req.body.email || null;
    const bio = req.body.bio || null;
    const role = req.body.role || 'creator';
    const location = req.body.location || null;
    const mapUrl = req.body.mapUrl || null;
    const profileImage = req.body.profileImage || null;
    
    const companyName = req.body.companyName || null;
    const companyEmail = req.body.companyEmail || null;
    const companyWebsite = req.body.companyWebsite || null;
    const hiringMember = req.body.hiringMember || null;
    const recruiterVerified = req.body.recruiterVerified ? 1 : 0;

    if (!username) {
      return res.status(400).json({ success: false, error: "A valid profile username is required." });
    }

    const cleanUsername = username.toLowerCase().trim();
    let sqlQuery = "";
    let values = [];

    if (role === "recruiter") {
      sqlQuery = `
        INSERT INTO recruiter_profiles 
          (clerk_user_id, username, full_name, email, bio, role, location, map_url, profile_image, company_name, company_email, company_website, hiring_member, recruiter_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          full_name = VALUES(full_name),
          email = VALUES(email),
          bio = VALUES(bio),
          role = VALUES(role),
          location = VALUES(location),
          map_url = VALUES(map_url),
          profile_image = VALUES(profile_image),
          company_name = VALUES(company_name),
          company_email = VALUES(company_email),
          company_website = VALUES(company_website),
          hiring_member = VALUES(hiring_member),
          recruiter_verified = VALUES(recruiter_verified)
      `;
      
      // FIXED SCHEMA ORDER: Matches your exact column order character-for-character
      values = [
        userId,            // clerk_user_id
        cleanUsername,     // username
        fullName,          // full_name
        email,             // email
        bio,               // bio
        'recruiter',       // role
        location,          // location
        mapUrl,            // map_url
        profileImage,      // profile_image
        companyName,       // company_name
        companyEmail,      // company_email
        companyWebsite,    // company_website
        hiringMember,      // hiring_member
        recruiterVerified  // recruiter_verified
      ];

    } else if (role === "viewer") {
      sqlQuery = `
        INSERT INTO viewer_profiles 
          (clerk_user_id, username, full_name, email, bio, role, location, map_url, profile_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          full_name = VALUES(full_name),
          email = VALUES(email),
          bio = VALUES(bio),
          role = VALUES(role),
          location = VALUES(location),
          map_url = VALUES(map_url),
          profile_image = VALUES(profile_image)
      `;
      values = [userId, cleanUsername, fullName, email, bio, 'viewer', location, mapUrl, profileImage];

    } else {
      sqlQuery = `
        INSERT INTO creator_profiles (clerk_user_id, username, full_name, email, bio, role, location, map_url, profile_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          full_name = VALUES(full_name),
          email = VALUES(email),
          bio = VALUES(bio),
          role = VALUES(role),
          location = VALUES(location),
          map_url = VALUES(map_url),
          profile_image = VALUES(profile_image)
      `;
      values = [userId, cleanUsername, fullName, email, bio, role, location, mapUrl, profileImage];
    }

    await pool.execute(sqlQuery, values);
    return res.status(200).json({ success: true, message: "Profile successfully saved!" });
  } catch (error) {
    console.error("Internal Engine Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

//  ROUTE 5: THE FETCH PROFILE ROUTE

app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.toLowerCase().trim();

    // 1. Fetch basic creator profile info
    const [creatorRows] = await pool.execute(
      'SELECT clerk_user_id, username, full_name, bio, role, location, map_url, profile_image, email FROM creator_profiles WHERE username = ?',
      [cleanUsername]
    );

    if (creatorRows.length > 0) {
      const creatorData = creatorRows[0];

      // 🔍 FIX: Changed 'views' to 'views_count' to perfectly match your schema setup
      const [reelsRows] = await pool.execute(
        'SELECT id, video_url, views_count, created_at FROM reels WHERE clerk_user_id = ? ORDER BY created_at DESC',
        [creatorData.clerk_user_id]
      );

      // Send data smoothly back to frontend
      return res.status(200).json({ 
        success: true, 
        data: { 
          ...creatorData, 
          actualRole: 'creator',
          reels: reelsRows // Includes the array of videos cleanly
        } 
      });
    }



    // 2. Verified Recruiter Profiles has company_email (or plain email if you use that)
    const [recruiterRows] = await pool.execute(
      'SELECT username, full_name, bio, role, location, map_url, profile_image, company_name, company_email, company_website, hiring_member, recruiter_verified FROM recruiter_profiles WHERE username = ?',
      [cleanUsername]
    );
    if (recruiterRows.length > 0) {
      // Mapping company_email to a normalized email property for frontend consistency
      return res.status(200).json({ success: true, data: { ...recruiterRows[0], email: recruiterRows[0].company_email, actualRole: 'recruiter' } });
    }

    // 3. Added 'email' to Viewer Profiles query if applicable
    const [viewerRows] = await pool.execute(
      'SELECT username, full_name, bio, role, location, map_url, profile_image, email FROM viewer_profiles WHERE username = ?',
      [cleanUsername]
    );
    if (viewerRows.length > 0) {
      return res.status(200).json({ success: true, data: { ...viewerRows[0], actualRole: 'viewer' } });
    }

    return res.status(200).json({ success: true, data: null });
  } catch (error) {
    console.error("MySQL Fetch Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});
 
// ==========================================
// 🎬 ROUTE 6: TOGGLE LIKE STATUS
// ==========================================
app.post('/api/reels/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUserId } = req.body; 

    if (!currentUserId) {
      return res.status(401).json({ success: false, error: "Unauthorized! User ID missing." });
    }

    await pool.execute('UPDATE reels SET likes_count = likes_count + 1 WHERE id = ?', [id]);
    
    return res.status(200).json({ success: true, message: "Like updated successfully!" });
  } catch (error) {
    console.error("Like Action Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

//  ROUTE 7: INCREMENT VIEW COUNT

app.post('/api/reels/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE reels SET views_count = views_count + 1 WHERE id = ?', [id]);
    
    return res.status(200).json({ success: true, message: "View tracked successfully!" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ROUTE: POST A NEW COLLABORATION OPPORTUNITY

app.post('/api/opportunities', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized! Please login first." });
    }

    const { title, companyName, description, salary } = req.body;

    if (!title || !companyName || !description || !salary) {
      return res.status(400).json({ success: false, error: "All fields are required!" });
    }

    const sqlQuery = `
      INSERT INTO business_opportunities (clerk_user_id, title, company_name, description, salary) 
      VALUES (?, ?, ?, ?, ?)
    `;
    await pool.execute(sqlQuery, [userId, title, companyName, description, salary]);

    return res.status(200).json({ success: true, message: "Opportunity posted successfully!" });
  } catch (error) {
    console.error("Opportunity Post Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});


//  FIX: SKILL-BASED LEADERBOARD TARGETING VIEWS_COUNT

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { skill } = req.query; 
    
    let sqlQuery = `
      SELECT 
        cp.clerk_user_id,
        cp.full_name,
        cp.username,
        cp.profile_image,
        cp.role,
        SUM(r.views_count) AS total_views, -- 🔍 FIX: Changed r.views to r.views_count
        COUNT(r.id) AS total_reels
      FROM creator_profiles cp
      INNER JOIN reels r ON cp.clerk_user_id = r.clerk_user_id
    `;
    
    const queryParams = [];
    
    if (skill && skill.trim() !== '') {
      sqlQuery += ` WHERE LOWER(cp.role) LIKE ? `;
      queryParams.push(`%${skill.toLowerCase().trim()}%`);
    }
    
    sqlQuery += `
      GROUP BY cp.clerk_user_id
      ORDER BY total_views DESC
      LIMIT 5
    `; 
    
    const [leaderboardData] = await pool.execute(sqlQuery, queryParams);
    return res.status(200).json({ success: true, data: leaderboardData });
  } catch (error) {
    console.error("Leaderboard Filter Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});



// ROUTE: GET ALL OPPORTUNITIES

app.get('/api/opportunities', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM business_opportunities ORDER BY created_at DESC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Fetch Opportunities Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

//  ROUTE: FETCH APPLICATIONS FOR AN OWNER'S POST

app.get('/api/opportunities/:id/applicants', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

    const opportunityId = req.params.id;

    // Verify ownership of the listing
    const [oppCheck] = await pool.execute(
      'SELECT clerk_user_id FROM business_opportunities WHERE id = ?', 
      [opportunityId]
    );

    if (oppCheck.length === 0 || oppCheck[0].clerk_user_id !== userId) {
      return res.status(403).json({ success: false, error: "Access Denied!" });
    }

    // Join application records directly with the dancer's creator profile details
    const [applicants] = await pool.execute(`
      SELECT 
        ja.id AS application_id, ja.cover_note, ja.status, ja.applied_at,
        cp.full_name, cp.username, cp.bio
      FROM job_applications ja
      JOIN creator_profiles cp ON ja.applicant_clerk_id = cp.clerk_user_id
      WHERE ja.opportunity_id = ?
      ORDER BY ja.applied_at DESC
    `, [opportunityId]);

    return res.status(200).json({ success: true, data: applicants });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

//  SECURE ROUTE: APPLY VIA PORTFOLIO (WITH COVER NOTE)

app.post('/api/applications', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized! Please login first." });
    }

    const { opportunityId, coverNote } = req.body;

    if (!opportunityId) {
      return res.status(400).json({ success: false, error: "Missing opportunity reference!" });
    }

    // Guard: Verify they are an actual creator
    const [creatorCheck] = await pool.execute(
      'SELECT id FROM creator_profiles WHERE clerk_user_id = ?',
      [userId]
    );

    if (creatorCheck.length === 0) {
      return res.status(403).json({ success: false, error: "Only registered Creators can apply to opportunities." });
    }

    // Guard: Prevent duplicate applications
    const [existing] = await pool.execute(
      'SELECT * FROM job_applications WHERE opportunity_id = ? AND applicant_clerk_id = ?',
      [opportunityId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "You have already applied to this opportunity!" });
    }

    // Insert application with cover note link context
    const sqlQuery = `
      INSERT INTO job_applications (opportunity_id, applicant_clerk_id, cover_note) 
      VALUES (?, ?, ?)
    `;
    await pool.execute(sqlQuery, [opportunityId, userId, coverNote || '']);

    return res.status(200).json({ success: true, message: "Application submitted successfully!" });
  } catch (error) {
    console.error("Application processing failure:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 🗑️ ROUTE: SECURE DELETE AN OPPORTUNITY
// ==========================================
app.delete('/api/opportunities/:id', async (req, res) => {
  try {
    const { userId } = getAuth(req); 
    
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized! Please login first." });
    }

    const { id } = req.params;

    // 1. Fetch the opportunity to verify ownership
    const [rows] = await pool.execute('SELECT * FROM business_opportunities WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Opportunity not found!" });
    }

    const opportunity = rows[0];

    // 2. Strict authorization check: Match the Clerk User IDs
    if (opportunity.clerk_user_id !== userId) {
      return res.status(403).json({ success: false, error: "You can only delete your own opportunities!" });
    }

    // 3. Clear from Database
    await pool.execute('DELETE FROM business_opportunities WHERE id = ?', [id]);

    return res.status(200).json({ success: true, message: "Opportunity deleted successfully!" });

  } catch (error) {
    console.error("Delete Opportunity Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} Not Found!` });
});

// Active Live Server Listener (Duplicate safely removed)
app.listen(PORT, () => {
  console.log(`🚀 Node.js Backend Server active on http://localhost:${PORT}`);
});