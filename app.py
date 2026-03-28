from flask import Flask, jsonify, request, send_from_directory
import sqlite3, os

app = Flask(__name__, static_folder='.')
DB = os.path.join(os.path.dirname(__file__), 'honey.db')

PRICE_PER_BOTTLE = 2500  # FCFA
PRICE_PER_LITER  = 5000  # 2 bouteilles × 2 500 FCFA


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


# ── Récoltes ────────────────────────────────────────────────────────────────

@app.route('/api/data', methods=['GET'])
def get_data():
    conn = get_db()
    rows = conn.execute('SELECT * FROM honey ORDER BY year, month').fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d['semester'] = 1 if d['month'] <= 6 else 2
        result.append(d)
    return jsonify(result)


@app.route('/api/data', methods=['POST'])
def add_data():
    body = request.get_json()
    year, month, production = body.get('year'), body.get('month'), body.get('production')
    if not all([year, month, production is not None]):
        return jsonify({'error': 'Champs manquants'}), 400
    conn = get_db()
    conn.execute('INSERT INTO honey (year, month, production) VALUES (?, ?, ?)', (year, month, production))
    conn.commit()
    conn.close()
    return jsonify({'success': True}), 201


# ── Commandes ────────────────────────────────────────────────────────────────

@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = get_db()
    rows = conn.execute('SELECT * FROM orders ORDER BY date DESC').fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d['value'] = d['quantity'] * PRICE_PER_BOTTLE
        result.append(d)
    return jsonify(result)


@app.route('/api/orders', methods=['POST'])
def add_order():
    body = request.get_json()
    date, client, quantity = body.get('date'), body.get('client'), body.get('quantity')
    if not all([date, client, quantity]):
        return jsonify({'error': 'Champs manquants'}), 400
    conn = get_db()
    conn.execute('INSERT INTO orders (date, client, quantity) VALUES (?, ?, ?)', (date, client, quantity))
    conn.commit()
    conn.close()
    return jsonify({'success': True}), 201


@app.route('/api/orders/<int:order_id>/deliver', methods=['PATCH'])
def deliver_order(order_id):
    conn = get_db()
    conn.execute("UPDATE orders SET status = 'livré' WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
