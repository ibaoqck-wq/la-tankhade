import os
import sqlite3
from flask import Flask, g, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "assessment.db")

app = Flask(__name__, static_folder=BASE_DIR, static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pre_score INTEGER NOT NULL CHECK(pre_score BETWEEN 0 AND 100),
                post_score INTEGER NOT NULL CHECK(post_score BETWEEN 0 AND 100),
                retention_score INTEGER NOT NULL DEFAULT 75 CHECK(retention_score BETWEEN 0 AND 100),
                challenge_score INTEGER NOT NULL CHECK(challenge_score BETWEEN 0 AND 100),
                senior_mode INTEGER NOT NULL CHECK(senior_mode IN (0, 1)),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cols = [r[1] for r in conn.execute("PRAGMA table_info(assessments)").fetchall()]
        if "retention_score" not in cols:
            conn.execute(
                "ALTER TABLE assessments ADD COLUMN retention_score INTEGER NOT NULL DEFAULT 75 CHECK(retention_score BETWEEN 0 AND 100)"
            )

        cur = conn.execute("SELECT COUNT(*) AS cnt FROM assessments")
        if cur.fetchone()[0] == 0:
            samples = [
                (60, 75, 74, 80, 0),
                (55, 75, 72, 80, 0),
                (65, 80, 78, 100, 1),
                (60, 80, 77, 80, 0),
                (60, 75, 73, 60, 1),
            ]
            conn.executemany(
                """
                INSERT INTO assessments (pre_score, post_score, retention_score, challenge_score, senior_mode)
                VALUES (?, ?, ?, ?, ?)
                """,
                samples,
            )
        conn.commit()


@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net; "
        "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data:; "
        "connect-src 'self';"
    )
    return response


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/api/metrics")
def get_metrics():
    db = get_db()
    row = db.execute(
        """
        SELECT
            COUNT(*) AS total_participants,
            COALESCE(ROUND(AVG(pre_score), 1), 0) AS avg_pre,
            COALESCE(ROUND(AVG(post_score), 1), 0) AS avg_post,
            COALESCE(ROUND(AVG(retention_score), 1), 0) AS avg_retention,
            COALESCE(ROUND(AVG(challenge_score), 1), 0) AS avg_challenge,
            COALESCE(SUM(senior_mode), 0) AS senior_sessions
        FROM assessments
        """
    ).fetchone()

    avg_pre = float(row["avg_pre"])
    avg_post = float(row["avg_post"])
    relative_gain = round(((avg_post - avg_pre) / avg_pre) * 100, 1) if avg_pre > 0 else 0.0

    return jsonify(
        {
            "total_participants": int(row["total_participants"]),
            "avg_pre": avg_pre,
            "avg_post": avg_post,
            "avg_retention": float(row["avg_retention"]),
            "avg_challenge": float(row["avg_challenge"]),
            "relative_gain": relative_gain,
            "senior_sessions": int(row["senior_sessions"]),
        }
    )


@app.post("/api/assessments")
def save_assessment():
    data = request.get_json(silent=True) or {}

    try:
        pre_score = int(data.get("pre_score", 60))
        post_score = int(data.get("post_score", 75))
        retention_score = int(data.get("retention_score", post_score))
        challenge_score = int(data.get("challenge_score", 0))
        senior_mode = 1 if data.get("senior_mode") else 0
    except (TypeError, ValueError):
        return jsonify({"error": "قيم التقييم يجب أن تكون أرقاماً صحيحة."}), 400

    if not (
        0 <= pre_score <= 100
        and 0 <= post_score <= 100
        and 0 <= retention_score <= 100
        and 0 <= challenge_score <= 100
    ):
        return jsonify({"error": "الدرجات يجب أن تقع بين 0 و 100."}), 400

    db = get_db()
    db.execute(
        """
        INSERT INTO assessments (pre_score, post_score, retention_score, challenge_score, senior_mode)
        VALUES (?, ?, ?, ?, ?)
        """,
        (pre_score, post_score, retention_score, challenge_score, senior_mode),
    )
    db.commit()

    return jsonify({"status": "saved", "anonymous": True}), 201


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)