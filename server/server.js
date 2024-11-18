const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "your_secret_key"; // Replace with a secure key
let progress = {}; // Global progress state
let connections = []; // Active SSE connections

// Mock user data
const users = [{ username: "user1" }, { username: "user2" }];

// Middleware to verify JWT
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    next();
  });
}

// Login endpoint
app.post("/api/login", (req, res) => {
  const { username } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ message: "Invalid username" });

  // Create a JWT token
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token });
});

// Protected SSE updates
app.get("/api/updates", (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, SECRET_KEY, (err) => {
    if (err) return res.status(403).json({ message: "Forbidden" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send initial progress data to the client
    Object.keys(progress).forEach((name) => {
      const data = JSON.stringify({ name, percentage: progress[name] });
      res.write(`data: ${data}\n\n`);
    });

    connections.push(res);

    req.on("close", () => {
      connections = connections.filter((conn) => conn !== res);
    });
  });
});

// Protected update endpoint
app.get("/api/update/:name", authenticate, (req, res) => {
  const { name } = req.params;

  if (progress[name] && progress[name] < 100) {
    return res.status(400).json({ message: `${name} is already updating.` });
  }

  progress[name] = 0;

  const interval = setInterval(() => {
    progress[name] += 10;
    connections.forEach((res) =>
      res.write(
        `data: ${JSON.stringify({ name, percentage: progress[name] })}\n\n`
      )
    );

    if (progress[name] >= 100) clearInterval(interval);
  }, 60 * 1000);

  res.json({ message: `${name} update started.` });
});

app.listen(4000, () => console.log("Server running on http://localhost:4000"));
