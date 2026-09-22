import sqlite3

con = sqlite3.connect('nextra.db')
cur = con.cursor()

cur.execute('SELECT id, name, email, role FROM users WHERE role="driver"')
print('DRIVER USERS in DB:', cur.fetchall())

cur.execute('SELECT id, driver_code, name, user_id FROM drivers')
print('DRIVERS in DB:', cur.fetchall()[:8])

cur.execute('SELECT id, shipment_code, driver_id, status FROM shipments ORDER BY id DESC LIMIT 5')
print('LATEST SHIPMENTS:', cur.fetchall())

con.close()
