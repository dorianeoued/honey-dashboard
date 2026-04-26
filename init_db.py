import sqlite3, os
DB = os.path.join(os.path.dirname(__file__), 'honey.db')
conn = sqlite3.connect(DB)

conn.execute('''CREATE TABLE IF NOT EXISTS honey (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL, month INTEGER NOT NULL, production REAL NOT NULL
)''')

conn.execute('''CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, client TEXT NOT NULL,
    quantity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'en_attente'
)''')

# Insérer données de démo seulement si vide
if conn.execute('SELECT COUNT(*) FROM honey').fetchone()[0] == 0:
    conn.executemany('INSERT INTO honey (year, month, production) VALUES (?, ?, ?)', [
        (2022, 4, 80), (2022, 11, 120), (2023, 5, 95), (2023, 11, 140),
    ])

if conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0] == 0:
    conn.executemany('INSERT INTO orders (date, client, quantity, status) VALUES (?, ?, ?, ?)', [
        ('2023-11-20', 'Marché de Ouaga', 20, 'livré'),
        ('2023-12-05', 'Restaurant Savane', 10, 'livré'),
        ('2024-01-15', 'Client particulier', 5, 'en_attente'),
    ])

conn.commit()
conn.close()
print('DB prête.')