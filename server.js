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

// Cargar historial
let chatHistory = { messages: [], groups: [] };
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) {
    console.error("Error leyendo historial:", e);
  }
}

// Guardar historial
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

// Lista de usuarios conectados
let users = {}; // socket.id -> { nickname, admin }

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Registro de nickname
  socket.on("set nickname", (nickname) => {
    users[socket.id] = { nickname, admin: false };
    socket.broadcast.emit("user joined", nickname);
    socket.emit("load history", chatHistory);
  });

  // Mensajes públicos
  socket.on("chat message", (msg) => {
    if (!users[socket.id]) return;
    const user = users[socket.id];
    const message = {
      type: "public",
      user: user.nickname,
      text: msg,
      time: new Date().toLocaleTimeString(),
      admin: user.admin
    };
    chatHistory.messages.push(message);
    saveHistory();
    io.emit("chat message", message);
  });

  // Mensajes privados
  socket.on("private message", ({ to, text }) => {
    if (!users[socket.id]) return;
    const user = users[socket.id];
    const message = {
      type: "private",
      from: user.nickname,
      to,
      text,
      time: new Date().toLocaleTimeString(),
      admin: user.admin
    };
    chatHistory.messages.push(message);
    saveHistory();
    io.emit("private message", message);
  });

  // Grupos
  socket.on("create group", (groupName) => {
    if (!chatHistory.groups.includes(groupName)) {
      chatHistory.groups.push(groupName);
      saveHistory();
      io.emit("group created", groupName);
    }
  });

  socket.on("group message", ({ group, text }) => {
    if (!users[socket.id]) return;
    const user = users[socket.id];
    const message = {
      type: "group",
      group,
      user: user.nickname,
      text,
      time: new Date().toLocaleTimeString(),
      admin: user.admin
    };
    chatHistory.messages.push(message);
    saveHistory();
    io.emit("group message", message);
  });

  // Evento: convertir en admin
  socket.on("become admin", () => {
    if (!users[socket.id]) return;
    users[socket.id].admin = true;

    // Avisar a todos que este usuario ahora es admin
    io.emit("user admin", users[socket.id].nickname);
  });

  // Indicador de escritura
  socket.on("typing", (isTyping) => {
    if (users[socket.id]) {
      socket.broadcast.emit("typing", {
        user: users[socket.id].nickname,
        isTyping,
      });
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      io.emit("user left", users[socket.id].nickname);
      delete users[socket.id];
    }
  });
});

// Endpoint para resetear
app.get("/reset", (req, res) => {
  chatHistory = { messages: [], groups: [] };
  saveHistory();
  res.send("Historial y grupos reiniciados.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});
