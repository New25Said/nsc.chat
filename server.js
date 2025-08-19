const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const HISTORY_FILE = path.join(__dirname, "chatHistory.json");
let chatHistory = { messages: [], groups: [] };

if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) {
    console.error("Error leyendo historial:", e);
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (e) {
    console.error("Error guardando historial:", e);
  }
}

let users = {}; // socket.id -> { nickname, admin }

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("set nickname", (nickname) => {
    users[socket.id] = { nickname, admin: false };
    socket.broadcast.emit("user joined", nickname);
    socket.emit("load history", chatHistory);
  });

  socket.on("chat message", (msg) => {
    if (!users[socket.id]) return;
    const u = users[socket.id];
    const message = { type: "public", user: u.nickname, text: msg, time: new Date().toLocaleTimeString(), admin: u.admin };
    chatHistory.messages.push(message);
    saveHistory();
    io.emit("chat message", message);
  });

  socket.on("private message", ({ to, text }) => {
    if (!users[socket.id]) return;
    const u = users[socket.id];
    const message = { type: "private", from: u.nickname, to, text, time: new Date().toLocaleTimeString(), admin: u.admin };
    chatHistory.messages.push(message);
    saveHistory();
    io.emit("private message", message);
  });

  socket.on("create group", (groupName) => {
    if (!chatHistory.groups.includes(groupName)) {
      chatHistory.groups.push(groupName);
      saveHistory();
      io.emit("group created", groupName);
    }
  });

  socket.on("group message", ({ group, text }) => {
    if (!users[socket.id]) return;
    const u = users[socket.id];
    const message = { type: "group", group, user: u.nickname, text, time: new Date().toLocaleTimeString(), admin: u.admin };
    chatHistory.messages.push(message);
    saveHistory();
    io.emit("group message", message);
  });

  socket.on("become admin", () => {
    if (!users[socket.id]) return;
    users[socket.id].admin = true;
    io.emit("user admin", users[socket.id].nickname);
  });

  socket.on("typing", (isTyping) => {
    if (users[socket.id]) {
      socket.broadcast.emit("typing", { user: users[socket.id].nickname, isTyping });
    }
  });

  socket.on("disconnect", () => {
    if (users[socket.id]) {
      io.emit("user left", users[socket.id].nickname);
      delete users[socket.id];
    }
  });
});

app.get("/reset", (req, res) => {
  chatHistory = { messages: [], groups: [] };
  saveHistory();
  res.send("Historial y grupos reiniciados.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor en puerto " + PORT));
