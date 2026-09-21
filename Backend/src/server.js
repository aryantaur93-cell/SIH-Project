import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const secret = process.env.JWT_SECRET || 'development-only-secret';
const origins = (process.env.CORS_ORIGIN || '*').split(',').map((x) => x.trim());
app.use(helmet());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }));

const sign = (user) => jwt.sign({ sub: user.user_id, role: user.role, area: user.assigned_area }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
function auth(req, res, next) { try { const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: 'Authentication required' }); req.user = jwt.verify(token, secret); next(); } catch { res.status(401).json({ error: 'Invalid or expired token' }); } }
function allow(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' }); }
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const coordinates = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'nextra-api', time: new Date().toISOString() }));
app.post('/api/auth/login', (req, res) => { const input = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body); if (!input.success) return res.status(400).json({ error: 'Valid email and password are required' }); const user = db.prepare('SELECT * FROM users WHERE lower(email)=lower(?) AND status=\'ACTIVE\'').get(input.data.email); if (!user || !bcrypt.compareSync(input.data.password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' }); const safe = { user_id:user.user_id, name:user.name, email:user.email, role:user.role, assigned_area:user.assigned_area }; db.prepare('INSERT INTO audit_logs (user_id,action,record_ref,details,created_at) VALUES (?,?,?,?,?)').run(user.user_id,'USER_LOGIN',user.user_id,'API login',new Date().toISOString()); res.json({ token: sign(safe), user: safe }); });
app.get('/api/auth/me', auth, (req,res) => res.json({ user: db.prepare('SELECT user_id,name,email,role,assigned_area,status FROM users WHERE user_id=?').get(req.user.sub) }));
app.get('/api/fleet', auth, (_,res) => res.json({ data: db.prepare('SELECT * FROM trucks ORDER BY truck_id').all() }));
app.get('/api/shipments', auth, (_,res) => res.json({ data: db.prepare('SELECT * FROM shipments ORDER BY created_at DESC').all() }));
app.get('/api/incidents', auth, (req,res) => res.json({ data: db.prepare('SELECT * FROM incidents ORDER BY created_at DESC').all() }));
app.post('/api/incidents', auth, (req,res) => { const input = z.object({ location:z.string().min(2), state:z.string().optional(), type:z.string().min(2), severity:z.enum(['LOW','MEDIUM','HIGH','CRITICAL']), description:z.string().min(5), lat:z.coerce.number().optional(), lon:z.coerce.number().optional() }).safeParse(req.body); if (!input.success) return res.status(400).json({ error:'Invalid incident payload', details:input.error.flatten() }); const id=`INC-${Date.now()}`; db.prepare('INSERT INTO incidents (incident_id,user_id,location,state,type,severity,description,lat,lon,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,req.user.sub,input.data.location,input.data.state || null,input.data.type,input.data.severity,input.data.description,input.data.lat || null,input.data.lon || null,new Date().toISOString()); res.status(201).json({ incident_id:id }); });
app.get('/api/dashboard', auth, (_,res) => res.json({ fleet:db.prepare('SELECT * FROM trucks').all(), shipments:db.prepare('SELECT * FROM shipments ORDER BY created_at DESC').all(), incidents:db.prepare('SELECT * FROM incidents ORDER BY created_at DESC LIMIT 50').all(), metrics:{ activeVehicles:db.prepare("SELECT count(*) c FROM trucks WHERE status='IN_TRANSIT'").get().c, activeShipments:db.prepare("SELECT count(*) c FROM shipments WHERE status IN ('IN_TRANSIT','DELAYED')").get().c, openIncidents:db.prepare("SELECT count(*) c FROM incidents WHERE status='PENDING'").get().c } }));
const weatherCache = new Map();
app.get('/api/weather', asyncRoute(async (req,res) => { const p=coordinates.safeParse(req.query); if (!p.success) return res.status(400).json({error:'lat and lon are required'}); const key=`${p.data.lat.toFixed(2)},${p.data.lon.toFixed(2)}`; const cached=weatherCache.get(key); if(cached && cached.expires>Date.now()) return res.json(cached.data); const url=new URL('https://api.open-meteo.com/v1/forecast'); url.search=new URLSearchParams({latitude:p.data.lat,longitude:p.data.lon,current:'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',hourly:'temperature_2m,precipitation,wind_speed_10m,weather_code',forecast_days:'3',timezone:'Asia/Kolkata'}); const r=await fetch(url); if(!r.ok) throw new Error(`Weather provider returned ${r.status}`); const data=await r.json(); const result={source:'Open-Meteo',fetched_at:new Date().toISOString(),...data}; weatherCache.set(key,{data:result,expires:Date.now()+Number(process.env.EXTERNAL_DATA_CACHE_SECONDS||300)*1000}); res.json(result); }));
app.get('/api/weather/region', asyncRoute(async (_,res) => { const points=[['Guwahati','Assam',26.1445,91.7362],['Shillong','Meghalaya',25.5788,91.8933],['Imphal','Manipur',24.817,93.9368],['Agartala','Tripura',23.8315,91.2868],['Aizawl','Mizoram',23.7271,92.7176],['Kohima','Nagaland',25.6751,94.1086],['Itanagar','Arunachal Pradesh',27.0844,93.6053],['Gangtok','Sikkim',27.3389,88.6065]]; const data=await Promise.all(points.map(async ([city,state,lat,lon])=>{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`); return {city,state,lat,lon,weather:await r.json()};})); res.json({source:'Open-Meteo',fetched_at:new Date().toISOString(),data}); }));
app.get('/api/map/route', asyncRoute(async (req,res) => { const q=z.object({fromLat:z.coerce.number(),fromLon:z.coerce.number(),toLat:z.coerce.number(),toLon:z.coerce.number()}).safeParse(req.query); if(!q.success)return res.status(400).json({error:'fromLat, fromLon, toLat and toLon are required'}); const {fromLat,fromLon,toLat,toLon}=q.data; const url=`https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`; const r=await fetch(url,{headers:{'User-Agent':'NEXTRA-SIH-Project/1.0'}}); if(!r.ok)throw new Error(`Routing provider returned ${r.status}`); const body=await r.json(); if(body.code!=='Ok')return res.status(404).json({error:'No road route found'}); const route=body.routes[0]; res.json({source:'OSRM/OpenStreetMap',distance_km:route.distance/1000,duration_minutes:route.duration/60,geometry:route.geometry,steps:route.legs.flatMap(l=>l.steps)}); }));
app.use((err,_,res,__) => { console.error(err); res.status(502).json({error:'External data service unavailable', detail:process.env.NODE_ENV==='development'?err.message:undefined}); });
app.listen(port,()=>console.log(`NEXTRA API listening on http://localhost:${port}`));
