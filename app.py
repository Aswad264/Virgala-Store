import os, json, uuid, glob, smtplib, ssl, requests
from email.message import EmailMessage
from datetime import datetime
from flask import Flask, request, render_template_string, redirect, url_for, send_from_directory, session, jsonify

app = Flask(__name__)

# ---------- CONFIGURATION (ALL FROM ENVIRONMENT VARIABLES) ----------
app.secret_key = os.environ["SECRET_KEY"]                              # Required

PAYPAL_EMAIL = os.environ.get("PAYPAL_EMAIL")                          # Optional fallback? No, better required
if not PAYPAL_EMAIL:
    raise ValueError("PAYPAL_EMAIL environment variable not set")
PAYPAL_ME = "PluginsFor"                                               # Not sensitive, can stay hardcoded

DISCORD_WEBHOOK = os.environ.get("DISCORD_WEBHOOK")
GMAIL_USER = os.environ.get("GMAIL_USER")
GMAIL_APP_PASSWORD = os.environ["GMAIL_APP_PASSWORD"]                  # Required

# Validate required ones
if not DISCORD_WEBHOOK:
    raise ValueError("DISCORD_WEBHOOK environment variable not set")
if not GMAIL_USER:
    raise ValueError("GMAIL_USER environment variable not set")
if not GMAIL_APP_PASSWORD:
    raise ValueError("GMAIL_APP_PASSWORD environment variable not set")

UPLOAD_FOLDER = "uploads"
PENDING_ORDERS_FILE = "pending_orders.json"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------- LOAD / SAVE PLUGINS ----------
def load_plugins():
    plugins = []
    for f in glob.glob(os.path.join(UPLOAD_FOLDER, "*.json")):
        try:
            with open(f) as jf:
                data = json.load(jf)
            if all(k in data for k in ("name","price","description","filename")):
                data.setdefault("id", os.path.splitext(os.path.basename(f))[0])
                data.setdefault("password", "")
                plugins.append(data)
        except: pass
    plugins.sort(key=lambda x: x["id"])
    return plugins

def save_plugin(plugin_id, data):
    with open(os.path.join(UPLOAD_FOLDER, f"{plugin_id}.json"), "w") as f:
        json.dump(data, f, indent=2)

def delete_plugin_files(plugin_id):
    json_path = os.path.join(UPLOAD_FOLDER, f"{plugin_id}.json")
    if os.path.exists(json_path):
        with open(json_path) as f:
            meta = json.load(f)
        filename = meta.get("filename")
        if filename:
            try: os.remove(os.path.join(UPLOAD_FOLDER, filename))
            except: pass
        os.remove(json_path)

# ---------- PENDING ORDERS ----------
def load_pending_orders():
    if not os.path.exists(PENDING_ORDERS_FILE):
        return {}
    with open(PENDING_ORDERS_FILE) as f:
        return json.load(f)

def save_pending_order(order_id, data):
    orders = load_pending_orders()
    orders[order_id] = data
    with open(PENDING_ORDERS_FILE, "w") as f:
        json.dump(orders, f, indent=2)

# ---------- ROUTES ----------
@app.route("/")
def index():
    plugins = load_plugins()
    admin = session.get("admin", False)
    return render_template_string(MAIN_HTML, plugins=plugins, admin=admin)

@app.route("/upload", methods=["POST"])
def upload():
    if not session.get("admin"): return "Unauthorized", 403
    file = request.files.get("file")
    name = request.form.get("name", "Unnamed")
    desc = request.form.get("description", "")
    price = request.form.get("price", "0.00")
    if not file: return "No file", 400
    pid = uuid.uuid4().hex[:8]
    ext = os.path.splitext(file.filename)[1]
    fname = pid + ext
    file.save(os.path.join(UPLOAD_FOLDER, fname))
    meta = {"id":pid,"name":name,"price":price,"description":desc,"filename":fname}
    save_plugin(pid, meta)
    return redirect(url_for("index"))

@app.route("/delete/<pid>", methods=["POST"])
def delete(pid):
    if not session.get("admin"): return "Unauthorized", 403
    delete_plugin_files(pid)
    return redirect(url_for("index"))

@app.route("/edit/<pid>", methods=["POST"])
def edit(pid):
    if not session.get("admin"): return "Unauthorized", 403
    plugins = load_plugins()
    p = next((x for x in plugins if x["id"]==pid), None)
    if not p: return "Not found", 404
    p["name"] = request.form.get("name", p["name"])
    p["price"] = request.form.get("price", p["price"])
    p["description"] = request.form.get("description", p["description"])
    save_plugin(pid, p)
    return redirect(url_for("index"))

@app.route("/product/<pid>")
def product(pid):
    plugins = load_plugins()
    p = next((x for x in plugins if x["id"]==pid), None)
    if not p: return "Not found", 404
    admin = session.get("admin", False)
    return render_template_string(PRODUCT_HTML, plugin=p, admin=admin)

# ---------- DOWNLOAD ONLY FOR ADMIN ----------
@app.route("/download/<pid>")
def download(pid):
    if not session.get("admin"): return "Access denied", 403
    plugins = load_plugins()
    p = next((x for x in plugins if x["id"]==pid), None)
    if not p: return "Not found", 404
    return send_from_directory(UPLOAD_FOLDER, p["filename"])

# ---------- BUY FLOW (EMAIL COLLECTION → PAYPAL) ----------
@app.route("/buy/<pid>")
def buy(pid):
    plugins = load_plugins()
    p = next((x for x in plugins if x["id"]==pid), None)
    if not p: return "Not found", 404
    return render_template_string(BUY_EMAIL_HTML, plugin=p)

@app.route("/start-payment", methods=["POST"])
def start_payment():
    pid = request.form.get("plugin_id")
    email = request.form.get("email", "").strip()
    plugins = load_plugins()
    p = next((x for x in plugins if x["id"]==pid), None)
    if not p: return "Invalid plugin", 400
    if not email: return "Email required", 400

    order_id = uuid.uuid4().hex[:12]
    save_pending_order(order_id, {
        "plugin_id": pid,
        "email": email,
        "timestamp": datetime.utcnow().isoformat(),
        "price": p["price"]
    })

    paypal_url = "https://www.paypal.com/cgi-bin/webscr"
    params = {
        "cmd": "_xclick",
        "business": PAYPAL_EMAIL,
        "item_name": p["name"],
        "amount": p["price"],
        "currency_code": "USD",
        "notify_url": request.url_root.rstrip("/") + "/paypal-ipn",
        "return": request.url_root.rstrip("/") + "/payment-thankyou?order=" + order_id,
        "cancel_return": request.url_root.rstrip("/") + "/",
        "custom": order_id,
        "no_shipping": "1"
    }
    query = "&".join([f"{k}={v}" for k,v in params.items()])
    return redirect(paypal_url + "?" + query)

@app.route("/payment-thankyou")
def payment_thankyou():
    return render_template_string(THANKYOU_HTML)

# ---------- PAYPAL IPN LISTENER ----------
@app.route("/paypal-ipn", methods=["POST"])
def paypal_ipn():
    verify_url = "https://ipnpb.paypal.com/cgi-bin/webscr"
    params = request.form.copy()
    params["cmd"] = "_notify-validate"
    try:
        resp = requests.post(verify_url, data=params, timeout=30)
    except:
        return "IPN verify failed", 500
    if resp.text.strip() != "VERIFIED":
        return "Not verified", 400

    payment_status = request.form.get("payment_status", "")
    custom = request.form.get("custom", "")
    payer_email = request.form.get("payer_email", "")
    receiver_email = request.form.get("receiver_email", "")
    txn_id = request.form.get("txn_id", "")
    item_name = request.form.get("item_name", "")

    if payment_status != "Completed":
        return "Ignored non-completed", 200
    if receiver_email.lower() != PAYPAL_EMAIL.lower():
        return "Receiver mismatch", 200

    orders = load_pending_orders()
    if custom not in orders:
        return "Order not found", 200

    order = orders[custom]
    plugins = load_plugins()
    plugin = next((x for x in plugins if x["id"]==order["plugin_id"]), None)
    if not plugin:
        return "Plugin gone", 200

    # Send file via email
    try:
        send_email_with_attachment(
            to_email=order["email"],
            subject=f"Your purchase: {plugin['name']}",
            body=f"Thank you for buying {plugin['name']} ($ {plugin['price']}).\nYour file is attached.\nEnjoy!",
            file_path=os.path.join(UPLOAD_FOLDER, plugin["filename"])
        )
    except Exception as e:
        print("Email error:", e)
    else:
        del orders[custom]
        with open(PENDING_ORDERS_FILE, "w") as f:
            json.dump(orders, f, indent=2)

    # Discord notification
    discord_msg = {
        "content": "💰 **New Purchase!**",
        "embeds": [{
            "title": item_name,
            "fields": [
                {"name": "Buyer Email", "value": payer_email or order["email"], "inline": True},
                {"name": "Price", "value": f"$ {plugin['price']}", "inline": True},
                {"name": "Transaction ID", "value": txn_id, "inline": False}
            ],
            "color": 0x00ff00
        }]
    }
    try:
        requests.post(DISCORD_WEBHOOK, json=discord_msg)
    except: pass

    return "OK", 200

def send_email_with_attachment(to_email, subject, body, file_path):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.set_content(body)
    with open(file_path, "rb") as f:
        file_data = f.read()
        fname = os.path.basename(file_path)
    msg.add_attachment(file_data, maintype="application", subtype="octet-stream", filename=fname)
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        server.send_message(msg)

# ---------- OTHER ROUTES ----------
@app.route("/admin-auth", methods=["POST"])
def admin_auth():
    data = request.get_json()
    if data and data.get("secret") == "adminmodebyaswad_ib":
        session["admin"] = True
        return jsonify(success=True)
    return jsonify(success=False)

@app.route("/deplugin")
def deplugin():
    return render_template_string(DEPLUGIN_HTML)

@app.route("/send_deplugin", methods=["POST"])
def send_deplugin():
    desc = request.form.get("description","")
    dlink = request.form.get("discord_link","")
    dname = request.form.get("discord_name","")
    price = request.form.get("estimated_price","Not given")
    webhook_data = {
        "content": "📩 **New De‑Plugin Request**",
        "embeds": [{
            "title": "Request Details",
            "fields": [
                {"name":"Discord Name","value":dname,"inline":True},
                {"name":"Discord Server","value":dlink,"inline":True},
                {"name":"Estimated Price","value":price,"inline":True},
                {"name":"Description","value":desc}
            ],
            "color":0x00ff00
        }]
    }
    try:
        requests.post(DISCORD_WEBHOOK, json=webhook_data)
    except: pass
    return render_template_string("<h2>✅ Request sent! I'll check Discord soon.</h2><a href='/'>Back</a>")

# ---------- HTML TEMPLATES (unchanged, same as your original) ----------
MAIN_HTML = r'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Virgala Store</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #02020a; --surface: #0e0e18; --border: #2a2a4a;
            --text: #e0e0ff; --accent1: #ff3c5a; --accent2: #00f0ff; --gold: #ffd700;
        }
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Rajdhani', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            overflow-x: hidden;
            cursor: none;
        }
        #custom-cursor {
            width: 20px; height: 20px;
            border: 2px solid var(--accent2);
            border-radius: 50%;
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%);
            mix-blend-mode: difference;
        }
        #starfield { position: fixed; top:0; left:0; width:100%; height:100%; z-index:0; }
        #neon-rain { position: fixed; top:0; left:0; width:100%; height:100%; z-index:0; opacity: 0.15; }
        #mouse-glow {
            position: fixed; pointer-events: none; z-index:998;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%);
            transform: translate(-50%, -50%); border-radius:50%;
        }
        .content { position: relative; z-index:1; max-width:1300px; margin:0 auto; padding:20px; }
        .navbar {
            display: flex; justify-content: space-between; align-items: center;
            padding: 15px 30px; border-radius: 18px; margin-bottom: 30px;
            background: rgba(14,14,24,0.7); backdrop-filter: blur(15px);
            border: 1px solid var(--border);
        }
        .logo {
            font-family: 'Orbitron', sans-serif; font-size: 2.5rem; font-weight: 900;
            background: linear-gradient(135deg, #fff, var(--accent2));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            letter-spacing: 3px;
            animation: logoGlitch 3s infinite;
        }
        @keyframes logoGlitch {
            0%, 100% { text-shadow: 0 0 10px var(--accent2); }
            50% { text-shadow: 0 0 20px var(--accent1), 0 0 30px var(--accent2); }
        }
        .nav-links a {
            color: var(--text); text-decoration: none; margin-left: 25px;
            font-weight: 600; text-transform: uppercase;
        }
        .nav-links a:hover { color: var(--accent2); text-shadow: 0 0 15px var(--accent2); }
        #admin-indicator {
            margin-left: 20px; padding: 4px 14px; background: rgba(0,240,255,0.1);
            border: 1px solid var(--accent2); border-radius: 20px;
            color: var(--accent2); font-weight: bold; display: none;
        }
        #admin-indicator.active { display: inline-block; }
        .hero { text-align: center; margin: 30px 0 50px; }
        .hero h2 {
            font-family: 'Orbitron', sans-serif; font-size: 4.5rem;
            color: #fff; text-shadow: 0 0 40px var(--accent2), 0 0 10px var(--accent1);
            letter-spacing: 6px;
        }
        .hero p { font-size: 1.4rem; color: #a0a0c0; }
        .admin-panel {
            background: rgba(10,10,20,0.9); backdrop-filter: blur(25px);
            border: 1px solid var(--accent2); box-shadow: 0 0 40px rgba(0,240,255,0.15);
            border-radius: 20px; padding: 25px; margin-bottom: 40px;
            display: none;
        }
        .admin-panel.visible { display: block; }
        .admin-panel h3 { font-family: 'Orbitron', sans-serif; color: var(--accent2); margin-bottom: 20px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-grid input, .form-grid textarea {
            width: 100%; padding: 12px; border-radius: 8px;
            background: #0c0c18; border: 1px solid var(--border); color: #fff;
        }
        .form-grid textarea { grid-column: span 2; }
        .form-grid button {
            grid-column: span 2; padding: 14px; border: none;
            border-radius: 8px; background: linear-gradient(135deg, var(--accent2), var(--accent1));
            color: #000; font-weight: bold; font-family: 'Orbitron', sans-serif;
            cursor: pointer;
        }
        .section-title {
            font-family: 'Orbitron', sans-serif; font-size: 2rem; margin: 30px 0 20px;
            color: #fff; text-shadow: 0 0 15px var(--accent2);
        }
        .plugin-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 30px; margin-bottom: 60px;
        }
        .plugin-card {
            background: rgba(14,14,24,0.7); backdrop-filter: blur(12px);
            border: 1px solid var(--border); border-radius: 20px; padding: 20px;
            transition: transform 0.3s, box-shadow 0.4s;
            position: relative; overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            transform-style: preserve-3d;
        }
        .plugin-card::before {
            content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: conic-gradient(from 90deg, transparent, var(--accent2), transparent, var(--accent1));
            opacity: 0; transition: opacity 0.5s; animation: rotate 8s linear infinite;
            z-index: -1;
        }
        .plugin-card:hover::before { opacity: 0.1; }
        .plugin-card:hover {
            border-color: var(--accent2);
            box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 40px rgba(0,240,255,0.3);
        }
        .plugin-card h4 {
            font-family: 'Orbitron', sans-serif; font-size: 1.6rem; margin-bottom: 10px;
            color: #fff; text-shadow: 0 0 8px var(--accent2);
        }
        .plugin-card h4 a { color:inherit; text-decoration:none; }
        .plugin-card .desc { color: #a0a0c0; margin-bottom: 15px; }
        .plugin-card .price {
            font-size: 2.2rem; font-weight: bold; color: var(--gold);
            text-shadow: 0 0 15px rgba(255,215,0,0.6); margin-bottom: 20px;
        }
        .btn {
            display: inline-block; padding: 10px 20px; border-radius: 8px;
            font-weight: bold; text-decoration: none; text-align: center;
            transition: 0.3s; font-family: 'Orbitron', sans-serif; letter-spacing: 1px;
            cursor: pointer; margin: 4px;
        }
        .btn-buy { background: linear-gradient(135deg, var(--accent2), var(--accent1)); color: #000; box-shadow: 0 0 20px rgba(0,240,255,0.5); }
        .btn-buy:hover { filter: brightness(1.2); transform: scale(1.04); }
        .btn-details { background: transparent; border: 1px solid var(--accent2); color: var(--accent2); }
        .btn-edit { background: transparent; border: 1px solid var(--gold); color: var(--gold); }
        .btn-delete { background: transparent; border: 1px solid #ff3c5a; color: #ff3c5a; }
        .admin-btns { margin-top: 10px; display: flex; gap: 8px; }
        .empty-state { text-align: center; padding: 80px; color: #555; }
        footer { text-align: center; padding: 30px; border-top: 1px solid var(--border); color: #666; }
        @keyframes rotate { 100%{transform:rotate(360deg);} }
    </style>
</head>
<body>
<canvas id="starfield"></canvas>
<canvas id="neon-rain"></canvas>
<div id="mouse-glow"></div>
<div id="custom-cursor"></div>
<div class="content">
    <nav class="navbar">
        <div class="logo">VIRGALA STORE</div>
        <div class="nav-links">
            <a href="/deplugin">Custom</a>
            <span id="admin-indicator">ADMIN MODE</span>
        </div>
    </nav>

    <div class="hero">
        <h2>VIRGALA</h2>
        <p>Unbeatable plugins — instant delivery.</p>
    </div>

    <div class="admin-panel" id="admin-panel">
        <h3>🔐 Admin Upload</h3>
        <form class="form-grid" action="/upload" method="post" enctype="multipart/form-data">
            <input type="text" name="name" placeholder="Plugin Name" required>
            <input type="text" name="price" placeholder="Price (USD)" value="5.00">
            <textarea name="description" placeholder="Description" rows="3"></textarea>
            <input type="file" name="file" required style="grid-column: span 2;">
            <button type="submit">⬆️ Upload & List</button>
        </form>
        <p style="margin-top:15px; color:#888;">Or drop a .json + file manually in /uploads</p>
    </div>

    <div class="section-title">🔥 Available Plugins</div>
    {% if plugins %}
    <div class="plugin-grid">
        {% for p in plugins %}
        <div class="plugin-card">
            <h4><a href="/product/{{ p.id }}">{{ p.name }}</a></h4>
            <p class="desc">{{ p.description }}</p>
            <div class="price">${{ p.price }}</div>
            <div style="display: flex; gap: 10px;">
                <a class="btn btn-buy" href="/product/{{ p.id }}">💰 Buy</a>
                <a class="btn btn-details" href="/product/{{ p.id }}">📄 Details</a>
            </div>
            {% if admin %}
            <div class="admin-btns" style="margin-top:10px;">
                <button class="btn btn-edit" onclick="openEditModal('{{ p.id }}','{{ p.name }}','{{ p.price }}','{{ p.description }}')">✏️ Edit</button>
                <form action="/delete/{{ p.id }}" method="post" style="display:inline;" onsubmit="return confirm('Delete?');">
                    <button class="btn btn-delete">🗑️ Delete</button>
                </form>
            </div>
            {% endif %}
        </div>
        {% endfor %}
    </div>
    {% else %}
    <div class="empty-state">⚡ No plugins yet.</div>
    {% endif %}

    <footer>
        <p>© 2026 Virgala Store | <a href="/deplugin" style="color:var(--accent2);">Request Custom Plugin</a></p>
    </footer>
</div>

<!-- Edit Modal -->
<div id="edit-modal" style="display:none; position:fixed; z-index:2000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8);">
    <div style="background:#0e0e18; border:1px solid #00f0ff; border-radius:16px; padding:20px; max-width:500px; margin:10% auto;">
        <h3 style="color:#00f0ff;">Edit Plugin</h3>
        <form id="edit-form" method="post">
            <input type="text" name="name" id="edit-name" required style="width:100%; margin-bottom:10px; background:#0c0c18; border:1px solid #2a2a4a; color:#fff; padding:10px;">
            <input type="text" name="price" id="edit-price" required style="width:100%; margin-bottom:10px; background:#0c0c18; border:1px solid #2a2a4a; color:#fff; padding:10px;">
            <textarea name="description" id="edit-desc" rows="3" style="width:100%; margin-bottom:10px; background:#0c0c18; border:1px solid #2a2a4a; color:#fff; padding:10px;"></textarea>
            <div style="display:flex; gap:10px;">
                <button type="submit" class="btn btn-buy" style="width:auto;">Save</button>
                <button type="button" class="btn btn-delete" onclick="document.getElementById('edit-modal').style.display='none'" style="width:auto;">Cancel</button>
            </div>
        </form>
    </div>
</div>

<script>
    const cursor = document.getElementById('custom-cursor');
    document.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX+'px'; cursor.style.top = e.clientY+'px'; });

    const glow = document.getElementById('mouse-glow');
    document.addEventListener('mousemove', (e) => { glow.style.left = e.clientX+'px'; glow.style.top = e.clientY+'px'; });

    const starCanvas = document.getElementById('starfield');
    const starCtx = starCanvas.getContext('2d');
    let stars = [];
    function resizeStar() { starCanvas.width = window.innerWidth; starCanvas.height = window.innerHeight; }
    window.addEventListener('resize', resizeStar); resizeStar();
    for(let i=0;i<200;i++) stars.push({x:Math.random()*starCanvas.width, y:Math.random()*starCanvas.height, r:Math.random()*2, s:0.3+Math.random()*0.5, o:Math.random()});
    function drawStars() {
        starCtx.clearRect(0,0,starCanvas.width,starCanvas.height);
        for(let s of stars) {
            starCtx.beginPath(); starCtx.arc(s.x,s.y,s.r,0,2*Math.PI);
            starCtx.fillStyle = `rgba(200,220,255,${s.o})`; starCtx.fill();
            s.y += s.s; if(s.y>starCanvas.height) {s.y=0; s.x=Math.random()*starCanvas.width;}
        }
        requestAnimationFrame(drawStars);
    }
    drawStars();

    const rainCanvas = document.getElementById('neon-rain');
    const rainCtx = rainCanvas.getContext('2d');
    rainCanvas.width = window.innerWidth; rainCanvas.height = window.innerHeight;
    let drops = [];
    for(let i=0;i<100;i++) drops.push({x:Math.random()*rainCanvas.width, y:Math.random()*rainCanvas.height, len:20+Math.random()*50, speed:2+Math.random()*5});
    function drawRain() {
        rainCtx.clearRect(0,0,rainCanvas.width,rainCanvas.height);
        rainCtx.strokeStyle = 'rgba(0,240,255,0.2)';
        rainCtx.lineWidth = 1;
        for(let d of drops) {
            rainCtx.beginPath(); rainCtx.moveTo(d.x, d.y); rainCtx.lineTo(d.x, d.y+d.len); rainCtx.stroke();
            d.y+=d.speed; if(d.y>rainCanvas.height) {d.y=-d.len; d.x=Math.random()*rainCanvas.width;}
        }
        requestAnimationFrame(drawRain);
    }
    drawRain();

    document.querySelectorAll('.plugin-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            const centerX = rect.width/2, centerY = rect.height/2;
            card.style.transform = `perspective(800px) rotateX(${(y-centerY)/8}deg) rotateY(${(centerX-x)/8}deg) translateY(-8px)`;
        });
        card.addEventListener('mouseleave', () => card.style.transform = '');
    });

    const SECRET = "adminmodebyaswad_ib";
    let buffer = "", timer, adminUnlocked = {{ 'true' if admin else 'false' }};
    const panel = document.getElementById("admin-panel"), indicator = document.getElementById("admin-indicator");
    if(adminUnlocked) { panel.classList.add("visible"); indicator.classList.add("active"); }
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        clearTimeout(timer);
        buffer += e.key;
        if(buffer.length > 100) buffer = buffer.slice(-100);
        timer = setTimeout(() => buffer = "", 2000);
        if(!adminUnlocked && buffer.includes(SECRET)) {
            adminUnlocked = true;
            panel.classList.add("visible");
            indicator.classList.add("active");
            buffer = "";
            fetch("/admin-auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({secret: SECRET}) });
        }
    });

    window.openEditModal = (id,name,price,desc) => {
        document.getElementById("edit-form").action = "/edit/"+id;
        document.getElementById("edit-name").value = name;
        document.getElementById("edit-price").value = price;
        document.getElementById("edit-desc").value = desc;
        document.getElementById("edit-modal").style.display = "block";
    };
</script>
</body>
</html>
'''

PRODUCT_HTML = r'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ plugin.name }} - Virgala Store</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
    <style>
        body { background: #02020a; color: #e0e0ff; font-family: 'Rajdhani', sans-serif; margin:0; padding:0; min-height:100vh; display: flex; justify-content: center; align-items: center; }
        .container {
            background: rgba(14,14,24,0.9); backdrop-filter: blur(20px);
            border: 1px solid #2a2a4a; border-radius: 24px; padding: 50px;
            max-width: 800px; width: 90%;
            box-shadow: 0 0 60px rgba(0,240,255,0.2);
        }
        h1 {
            font-family: 'Orbitron', sans-serif; font-size: 3rem;
            color: #fff; text-shadow: 0 0 20px #00f0ff; margin-bottom: 20px;
        }
        .price {
            font-size: 3rem; font-weight: bold; color: #ffd700;
            text-shadow: 0 0 20px rgba(255,215,0,0.8); margin: 20px 0;
        }
        .desc {
            color: #a0a0c0; font-size: 1.3rem; line-height: 1.6;
            margin: 30px 0; white-space: pre-wrap;
        }
        .actions {
            margin-top: 40px; display: flex; gap: 20px;
        }
        .btn {
            padding: 16px 30px; border-radius: 12px; font-weight: bold;
            text-decoration: none; font-family: 'Orbitron', sans-serif;
            font-size: 1.2rem; transition: 0.3s; display: inline-block;
        }
        .btn-buy {
            background: linear-gradient(135deg, #00f0ff, #ff3c5a);
            color: #000; box-shadow: 0 0 30px rgba(0,240,255,0.6);
        }
        .btn-buy:hover { filter: brightness(1.2); transform: scale(1.05); }
        .btn-back {
            border: 1px solid #00f0ff; color: #00f0ff;
        }
        .btn-back:hover { background: rgba(0,240,255,0.1); }
        {% if admin %}
        .admin-dl {
            background: transparent; border: 1px solid #ffd700; color: #ffd700;
        }
        {% endif %}
    </style>
</head>
<body>
<div class="container">
    <h1>{{ plugin.name }}</h1>
    <div class="price">${{ plugin.price }}</div>
    <div class="desc">{{ plugin.description }}</div>
    <div class="actions">
        <a class="btn btn-buy" href="/buy/{{ plugin.id }}">💳 Buy Now</a>
        <a class="btn btn-back" href="/">← Back to Store</a>
        {% if admin %}
        <a class="btn admin-dl" href="/download/{{ plugin.id }}">⬇️ Admin Download</a>
        {% endif %}
    </div>
</div>
</body>
</html>
'''

BUY_EMAIL_HTML = r'''
<!DOCTYPE html>
<html>
<head>
    <title>Complete Purchase - Virgala Store</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
    <style>
        body { background: #02020a; color: #e0e0ff; font-family: 'Rajdhani', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0; }
        form { background: rgba(14,14,24,0.9); backdrop-filter: blur(15px); padding: 40px; border-radius: 20px; border: 1px solid #2a2a4a; text-align: center; width: 350px; }
        h2 { color: #fff; font-family: 'Orbitron', sans-serif; margin-bottom: 20px; }
        input { width: 100%; padding: 12px; margin: 10px 0; background: #0c0c18; border: 1px solid #2a2a4a; color: #fff; font-size: 1rem; border-radius: 8px; }
        button {
            background: linear-gradient(135deg, #00f0ff, #ff3c5a); color: #000; font-weight: bold;
            padding: 14px; border: none; width: 100%; border-radius: 8px; font-family: 'Orbitron', sans-serif;
            font-size: 1.1rem; cursor: pointer; margin-top: 10px;
        }
        .back { color: #00f0ff; margin-top: 15px; display: block; text-decoration: none; }
    </style>
</head>
<body>
<form action="/start-payment" method="post">
    <h2>Buy {{ plugin.name }}</h2>
    <p style="color:#ffd700; font-size:2rem;">${{ plugin.price }}</p>
    <input type="hidden" name="plugin_id" value="{{ plugin.id }}">
    <input type="email" name="email" placeholder="Your email for delivery" required>
    <button type="submit">Proceed to PayPal</button>
    <a class="back" href="/">Cancel</a>
</form>
</body>
</html>
'''

THANKYOU_HTML = r'''
<!DOCTYPE html>
<html>
<head><title>Thank You - Virgala Store</title>
<style> body { background:#02020a; color:#e0e0ff; font-family:'Rajdhani',sans-serif; text-align:center; padding-top:100px; } a { color:#00f0ff; } </style>
</head>
<body>
<h2>Thank you for your purchase!</h2>
<p>Your file will be emailed to you shortly. Please check your inbox (and spam folder).</p>
<a href="/">Back to store</a>
</body>
</html>
'''

DEPLUGIN_HTML = r'''
<!DOCTYPE html>
<html>
<head><title>Custom Plugin Request - Virgala Store</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;700&display=swap" rel="stylesheet">
<style> body { background:#02020a; color:#e0e0ff; font-family:'Rajdhani',sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; } form { background:rgba(14,14,24,0.9); padding:30px; border-radius:16px; border:1px solid #2a2a4a; } input,textarea { width:100%; margin-bottom:15px; padding:10px; background:#0c0c18; border:1px solid #2a2a4a; color:#fff; } button { background:#00f0ff; color:#000; font-weight:bold; padding:12px; border:none; width:100%; cursor:pointer; } a { color:#00f0ff; } </style>
</head>
<body>
<form action="/send_deplugin" method="post">
    <h2>Request Custom Plugin</h2>
    <input name="discord_name" placeholder="Your Discord username" required>
    <input name="discord_link" placeholder="Discord server invite link" required>
    <textarea name="description" placeholder="Describe plugin..." rows="4" required></textarea>
    <input name="estimated_price" placeholder="Estimated price">
    <button type="submit">Send Request</button>
    <div style="text-align:center; margin-top:10px;"><a href="/">← Back</a></div>
</form>
</body>
</html>
'''

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)