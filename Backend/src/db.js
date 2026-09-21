import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.env.DATABASE_FILE || path.join(root, 'data', 'nextra.sqlite');
fs.mkdirSync(path.dirname(file), { recursive: true });
export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, user_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, assigned_area TEXT NOT NULL DEFAULT 'ALL', status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trucks (id INTEGER PRIMARY KEY, truck_id TEXT UNIQUE NOT NULL, plate_number TEXT, vehicle_type TEXT, capacity_kg INTEGER, driver_name TEXT, current_location TEXT, status TEXT NOT NULL DEFAULT 'AVAILABLE', lat REAL, lon REAL, speed_kmh REAL DEFAULT 0, fuel_level REAL DEFAULT 100, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shipments (id INTEGER PRIMARY KEY, shipment_id TEXT UNIQUE NOT NULL, origin TEXT NOT NULL, destination TEXT NOT NULL, cargo TEXT, weight_kg REAL, truck_id TEXT, status TEXT NOT NULL, risk_level TEXT, corridor TEXT, eta TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS incidents (id INTEGER PRIMARY KEY, incident_id TEXT UNIQUE NOT NULL, user_id TEXT, location TEXT NOT NULL, state TEXT, type TEXT NOT NULL, severity TEXT NOT NULL, description TEXT NOT NULL, lat REAL, lon REAL, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(user_id));
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, record_ref TEXT, details TEXT, created_at TEXT NOT NULL);
`);

const now = new Date().toISOString();
const password = bcrypt.hashSync(process.env.DEMO_PASSWORD || 'change-me-demo', 12);
const users = [
  ['USR-001','Vikram Sengupta','admin@ner.gov.in','admin','ALL'],
  ['USR-002','Arjun Sharma','field@ner.gov.in','field_officer','MEGHALAYA'],
  ['USR-003','Meera Hazarika','logistics@ner.gov.in','logistics','ALL'],
  ['USR-004','Rahul Borah','driver@ner.gov.in','driver','MEGHALAYA']
];
const addUser = db.prepare(`INSERT OR IGNORE INTO users (user_id,name,email,password_hash,role,assigned_area,created_at) VALUES (?,?,?,?,?,?,?)`);
for (const [id,name,email,role,area] of users) addUser.run(id,name,email,password,role,area,now);
const addTruck = db.prepare(`INSERT OR IGNORE INTO trucks (truck_id,plate_number,vehicle_type,capacity_kg,driver_name,current_location,status,lat,lon,speed_kmh,fuel_level,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
[
 ['VX-104','AS-01-GC-4102','Refrigerated medium truck',5000,'Rahul Borah','NH-6 Shillong Hill Section','IN_TRANSIT',25.92,91.82,42,78],
 ['NE-7210','AS-03-EC-7210','Heavy multi-axle carrier',24000,'Bikramjeet Chutia','NH-29 Nagaon Foothills','IN_TRANSIT',26.05,93.45,55,62],
 ['NE-5532','ML-05-AB-5532','Heavy flatbed container',28000,'Pranab Kalita','Sonapur staging depot','HALTED',25.10,92.35,0,84],
 ['NE-9104','AS-01-DD-9104','All-terrain 4x4',6500,'Sonam Dorjee','Guwahati freight hub','AVAILABLE',26.1445,91.7362,0,95]
].forEach((t) => addTruck.run(...t, now));
const addShipment = db.prepare(`INSERT OR IGNORE INTO shipments (shipment_id,origin,destination,cargo,weight_kg,truck_id,status,risk_level,corridor,eta,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
[
 ['SHP-801','Guwahati Central Hub','Shillong Civil Hospital','Essential medical vaccines',2400,'VX-104','IN_TRANSIT','MEDIUM','NH-6','Monitor weather',now],
 ['SHP-802','Guwahati Central Hub','Imphal Logistics Center','Telecom hardware and FMCG',14800,'NE-7210','IN_TRANSIT','LOW','NH-27 / NH-29','Today',now],
 ['SHP-803','Shillong Mountain Depot','Silchar Valley Hub','Infrastructure steel beams',22500,'NE-5532','DELAYED','CRITICAL','NH-6 Sonapur','Clearance pending',now]
].forEach((s) => addShipment.run(...s));
