require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const ical = require('node-ical');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({error:'no auth'});
  const token = auth.replace('Bearer ','').trim();
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){ return res.status(401).json({error:'invalid token'}); }
}

app.post('/auth/register', async (req, res) => {
  const {name, email, password, role='cleaner', phone } = req.body;
  if(!email || !password) return res.status(400).json({error:'missing'});
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const created_at = new Date().toISOString();
  db.run('INSERT INTO users (id,name,email,password_hash,role,phone,created_at) VALUES (?,?,?,?,?,?,?)', [id,name,email,hash,role,phone,created_at], function(err){
    if(err) return res.status(500).json({error:err.message});
    res.status(201).json({id});
  });
});

app.post('/auth/login', (req,res)=>{
  const {email,password} = req.body;
  db.get('SELECT * FROM users WHERE email=?',[email], async (err,row)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!row) return res.status(401).json({error:'invalid'});
    const ok = await bcrypt.compare(password, row.password_hash);
    if(!ok) return res.status(401).json({error:'invalid'});
    const token = jwt.sign({sub:row.id,role:row.role,name:row.name}, JWT_SECRET, {expiresIn:'8h'});
    res.json({accessToken:token});
  });
});

app.post('/properties', authMiddleware, (req,res)=>{
  const {title,address,default_clean_minutes} = req.body;
  const id = uuidv4(); const created_at = new Date().toISOString();
  db.run('INSERT INTO properties (id,title,address,owner_id,default_clean_minutes,created_at) VALUES (?,?,?,?,?,?)',[id,title, address, req.user.sub, default_clean_minutes||90, created_at], function(err){
    if(err) return res.status(500).json({error:err.message}); res.status(201).json({id});
  });
});

app.get('/properties', authMiddleware, (req,res)=>{
  db.all('SELECT * FROM properties',[],(err,rows)=>{
    if(err) return res.status(500).json({error:err.message}); res.json(rows || []);
  });
});

app.post('/bookings', authMiddleware, (req,res)=>{
  const {propertyId, checkin, checkout, source} = req.body;
  const id = uuidv4(); const created_at = new Date().toISOString();
  db.run('INSERT INTO bookings (id,property_id,external_id,checkin,checkout,source,created_at) VALUES (?,?,?,?,?,?,?)',[id,propertyId,null,checkin,checkout,source||'manual',created_at], function(err){
    if(err) return res.status(500).json({error:err.message}); res.status(201).json({id});
  });
});

app.get('/bookings', authMiddleware, (req,res)=>{
  db.all('SELECT * FROM bookings ORDER BY checkin DESC LIMIT 200',[],(err,rows)=>{
    if(err) return res.status(500).json({error:err.message}); res.json(rows || []);
  });
});

app.post('/tasks/generate-from-booking', authMiddleware, (req,res)=>{
  const {bookingId} = req.body;
  db.get('SELECT * FROM bookings WHERE id=?',[bookingId], (err,booking)=>{
    if(err) return res.status(500).json({error:err.message});
    if(!booking) return res.status(404).json({error:'not found'});
    const estimated = 90;
    const start = new Date(booking.checkout);
    const end = new Date(start.getTime() + estimated*60000);
    const id = uuidv4(); const created_at = new Date().toISOString();
    db.run('INSERT INTO tasks (id,booking_id,property_id,scheduled_start,scheduled_end,estimated_minutes,status,created_at) VALUES (?,?,?,?,?,?,?,?)',[id,booking.id,booking.property_id, start.toISOString(), end.toISOString(), estimated,'pending', created_at], function(err){
      if(err) return res.status(500).json({error:err.message}); res.status(201).json({id});
    });
  });
});

app.get('/tasks', authMiddleware, (req,res)=>{
  db.all('SELECT * FROM tasks ORDER BY scheduled_start DESC LIMIT 500',[],(err,rows)=>{
    if(err) return res.status(500).json({error:err.message}); res.json(rows || []);
  });
});

app.post('/tasks/:id/assign', authMiddleware, (req,res)=>{
  const taskId = req.params.id;
  const {cleanerId} = req.body;
  db.run('UPDATE tasks SET cleaner_id=?, status=? WHERE id=?',[cleanerId,'assigned',taskId], function(err){
    if(err) return res.status(500).json({error:err.message}); res.json({ok:true});
  });
});

app.post('/tasks/:id/accept', authMiddleware, (req,res)=>{
  const taskId = req.params.id;
  db.run('UPDATE tasks SET status=? WHERE id=?',['in_progress', taskId], function(err){ if(err) return res.status(500).json({error:err.message}); res.json({ok:true}); });
});

app.post('/tasks/:id/complete', authMiddleware, (req,res)=>{
  const taskId = req.params.id;
  const {checklist, photos, notes} = req.body;
  db.run('UPDATE tasks SET status=?, checklist=?, photos=?, notes=? WHERE id=?',['completed', JSON.stringify(checklist||{}), JSON.stringify(photos||[]), notes||'', taskId], function(err){ if(err) return res.status(500).json({error:err.message}); res.json({ok:true}); });
});

app.post('/webhook/ical/sync', authMiddleware, async (req,res)=>{
  const {url, propertyId} = req.body;
  try{
    const parsed = await ical.fromURL(url);
    for(const k in parsed){
      const ev = parsed[k];
      if(ev.type === 'VEVENT'){
        const checkin = ev.start.toISOString();
        const checkout = ev.end.toISOString();
        const externalId = ev.uid || (ev.summary||'') + checkin;
        db.get('SELECT * FROM bookings WHERE external_id = ?', [externalId], (err,row)=>{
          if(err) return;
          if(row){
            db.run('UPDATE bookings SET checkin=?, checkout=? WHERE external_id=?', [checkin, checkout, externalId]);
          } else {
            const id = uuidv4(); const created_at = new Date().toISOString();
            db.run('INSERT INTO bookings (id,property_id,external_id,checkin,checkout,source,created_at) VALUES (?,?,?,?,?,?,?)',[id,propertyId, externalId, checkin, checkout, 'ical', created_at]);
          }
        });
      }
    }
    res.json({ok:true});
  }catch(e){
    console.error(e); res.status(500).json({error:'ical error'});
  }
});

app.post('/notifications/sms', authMiddleware, async (req,res)=>{
  const {to, body} = req.body;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if(!sid || !token || !from) return res.status(400).json({error:'twilio not configured'});
  try{
    const client = twilio(sid, token);
    const msg = await client.messages.create({body, from, to});
    res.json({sid:msg.sid});
  }catch(e){ console.error(e); res.status(500).json({error:'twilio error'}); }
});

app.get('/', (req,res)=> res.json({ok:true, message:'CleanBnB API'}));

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log('Backend listening on', PORT));
