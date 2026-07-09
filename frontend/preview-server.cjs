const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "build");
const port = Number(process.env.PORT || 4173);

const users = {
  demo: {
    id: "demo-user",
    username: "demo",
    email: "demo@example.com",
    full_name: "Demo Student",
    school_name: "Monster Huddle Academy",
    town: "Preview Town",
    current_grade: 3,
    date_of_birth: "2012-07-03",
    role: "user",
    language: "en",
    total_points: 120,
    current_level: 2,
    stages_completed: ["level-1-stage-1", "level-1-stage-2"],
    total_time_spent: 3600,
    quizzes_completed: 4,
    created_at: "2026-01-01T00:00:00Z",
    previous_login_at: "2026-07-02T12:00:00Z",
    last_login_at: new Date().toISOString(),
  },
  admin: {
    id: "admin-user",
    username: "admin",
    email: "admin@example.com",
    full_name: "Admin User",
    school_name: "Monster Huddle Academy",
    town: "Preview Town",
    current_grade: 6,
    date_of_birth: "2010-07-03",
    role: "admin",
    language: "en",
    total_points: 999,
    current_level: 5,
    stages_completed: [],
    total_time_spent: 7200,
    quizzes_completed: 18,
    created_at: "2026-01-01T00:00:00Z",
    previous_login_at: "2026-07-02T12:00:00Z",
    last_login_at: new Date().toISOString(),
  },
};

const passwords = {
  demo: "demo123",
  admin: "admin123",
};

function getBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function getUserFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const username = token.replace(/^preview-token-/, "");
  return users[username] || null;
}

function sendApi(req, res, pathname) {
  if (req.method === "POST" && pathname === "/api/auth/login") {
    return getBody(req).then((body) => {
      const username = String(body.username || "").trim().toLowerCase();
      const user = users[username];
      if (!user || passwords[username] !== body.password) {
        sendJson(res, 401, { detail: "Invalid username or password" });
        return;
      }

      sendJson(res, 200, {
        token: `preview-token-${username}`,
        user: { ...user, last_login_at: new Date().toISOString() },
        message: "Login successful",
        remember_me: Boolean(body.remember_me),
      });
    });
  }

  const currentUser = getUserFromToken(req) || users.demo;

  if (req.method === "GET" && pathname === "/api/auth/me") {
    sendJson(res, 200, currentUser);
    return true;
  }

  if (req.method === "GET" && pathname === "/api/levels") {
    sendJson(res, 200, [
      { id: "level-1", level_num: 1, icon: "flame", color: "#8b5cf6", unlock_points: 0, is_unlocked: true, stages_completed: 2 },
      { id: "level-2", level_num: 2, icon: "target", color: "#ec4899", unlock_points: 100, is_unlocked: true, stages_completed: 1 },
      { id: "level-3", level_num: 3, icon: "mountain", color: "#0ea5e9", unlock_points: 250, is_unlocked: false, stages_completed: 0 },
      { id: "level-4", level_num: 4, icon: "hammer", color: "#f97316", unlock_points: 500, is_unlocked: false, stages_completed: 0 },
      { id: "level-5", level_num: 5, icon: "rocket", color: "#22c55e", unlock_points: 800, is_unlocked: false, stages_completed: 0 },
    ]);
    return true;
  }

  if (req.method === "GET" && pathname === "/api/progress/stats") {
    sendJson(res, 200, {
      total_points: currentUser.total_points,
      current_level: currentUser.current_level,
      total_time_spent: currentUser.total_time_spent,
      quizzes_completed: currentUser.quizzes_completed,
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/user/progression") {
    sendJson(res, 200, {
      current_level_num: currentUser.current_level,
      overall_percent: 48,
      is_max_level: currentUser.current_level >= 5,
      next_level_num: currentUser.current_level >= 5 ? null : currentUser.current_level + 1,
      next_level_rewards: {
        coins: 100,
        xp: 250,
        badge: "Focus",
      },
      total_questions_answered: 25,
      total_correct_answers: 18,
      progress: {
        apprentice: { current: 8, required: 10, percent: 80, complete: false },
        master: { current: 6, required: 10, percent: 60, complete: false },
        legend: { current: 4, required: 10, percent: 40, complete: false },
      },
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/welcome-message") {
    sendJson(res, 200, {
      message_en: "Keep going. Your next quiz is waiting.",
      message_zh: "继续加油，下一个测验正在等你。",
    });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/notices") {
    sendJson(res, 200, []);
    return true;
  }

  sendJson(res, 404, { detail: "Preview API route not implemented" });
  return true;
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendStatic(req, res, pathname) {
  const requested = path.normalize(path.join(root, decodeURIComponent(pathname)));
  const withinRoot = requested === root || requested.startsWith(root + path.sep);
  let filePath = withinRoot ? requested : path.join(root, "index.html");

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(root, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500);
      res.end("Preview server error");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": pathname.startsWith("/static/") ? "public, max-age=31536000, immutable" : "no-store",
    });
    res.end(data);
  });
}

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url || "/", `http://${req.headers.host}`);
    if (pathname.startsWith("/api/")) {
      sendApi(req, res, pathname);
      return;
    }
    sendStatic(req, res, pathname);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Preview: http://127.0.0.1:${port}`);
  });
