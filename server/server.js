// server.js - express backend skeleton with basic admin auth
// Usage: npm install
// Run: node server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.ensureDirSync(UPLOAD_DIR);

const DB_FILE = path.join(__dirname, 'db.json');
if(!fs.existsSync(DB_FILE)) fs.writeJsonSync(DB_FILE, []);

// Simple user store (for demo) - in production use proper DB
const AUTH_FILE = path.join(__dirname, 'auth.json');
if(!fs.existsSync(AUTH_FILE)) {
  // default admin: username: admin, password: admin123 (hashed)
  const defaultHash = bcrypt.hashSync('admin123', 10);
  fs.writeJsonSync(AUTH_FILE, [{ username: 'admin', passwordHash: defaultHash }], { spaces: 2 });
}

const users = fs.readJsonSync(AUTH_FILE);

// session setup
app.use(session({
  secret: 'indokarya_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

function ensureAuth(req, res, next){
  if(req.session && req.session.user) return next();
  return res.status(401).json({ success:false, message:'Unauthorized' });
}

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const all = await fs.readJson(AUTH_FILE);
  const user = all.find(u=>u.username===username);
  if(!user) return res.json({ success:false, message:'User not found' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.json({ success:false, message:'Invalid credentials' });
  req.session.user = { username };
  res.json({ success:true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(()=>{});
  res.json({ success:true });
});

// protected admin check route (used by admin.html script to confirm session)
app.get('/api/check-auth', (req, res) => {
  if(req.session && req.session.user) return res.json({ authenticated:true, user: req.session.user });
  return res.json({ authenticated:false });
});

// upload endpoint (open to public)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const body = req.body;
    const stored = { id: uuidv4(), nama: body.nama||'', asalSekolah: body.asalSekolah||'', kategoriLomba: body.kategoriLomba||'', tingkat: body.tingkat||'', file: req.file.filename, uploadedAt: new Date().toISOString() };
    const db = await fs.readJson(DB_FILE);
    db.push(stored);
    await fs.writeJson(DB_FILE, db, { spaces: 2 });
    res.json({ success: true, item: stored });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'upload error' });
  }
});

// list endpoint - protected for admin, public version also provided (public shows limited)
app.get('/api/list', async (req, res) => {
  const db = await fs.readJson(DB_FILE);
  // if admin session present, return full list; otherwise return limited public view (reverse order)
  if(req.session && req.session.user) return res.json(db.reverse());
  // public: return last 50 entries without exposing internal ids (but file links still valid)
  const pub = db.slice(-50).map(d=> ({ id: d.id, nama: d.nama, asalSekolah: d.asalSekolah, kategoriLomba: d.kategoriLomba, tingkat: d.tingkat, file: d.file, uploadedAt: d.uploadedAt } ));
  res.json(pub.reverse());
});

// delete endpoint - protected
app.delete('/api/delete/:id', ensureAuth, async (req, res) => {
  const id = req.params.id;
  let db = await fs.readJson(DB_FILE);
  const item = db.find(d=>d.id===id);
  if(item){
    await fs.remove(path.join(UPLOAD_DIR, item.file));
    db = db.filter(d=>d.id!==id);
    await fs.writeJson(DB_FILE, db, { spaces:2 });
  }
  res.json({ success:true });
});

// download zip - admin only
app.get('/api/download-zip', ensureAuth, async (req, res) => {
  const archiver = require('archiver');
  const db = await fs.readJson(DB_FILE);
  const files = db.map(d=>path.join(UPLOAD_DIR, d.file));
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=uploads.zip');
  const archive = archiver('zip');
  archive.pipe(res);
  files.forEach(f => {
    if(fs.existsSync(f)) archive.file(f, { name: path.basename(f) });
  });
  archive.finalize();
});

const PORT = process.env.PORT||3000;
app.listen(PORT, ()=> console.log('Server running on', PORT));