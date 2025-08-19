const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

// Archivo historial
const HISTORY_FILE = path.join(__dirname, "chatHistory.json");

// Cargar historial si existe
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE));
  } catch (err) {
    console.error("Error cargando historial:", err);
  }
}

// Guardar historial
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

// Usuarios conectados
let users = {};

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Enviar historial al nuevo
  socket.emit("chat history", chatHistory);

  // Registrar nickname
  socket.on("set nickname", (nickname) => {
    users[socket.id] = { nickname, isAdmin: false };
    io.emit("user list", Object.values(users));
  });

  // Activar admin
  socket.on("activate admin", () => {
    if (users[socket.id]) {
      users[socket.id].isAdmin = true;
      io.emit("user list", Object.values(users));
    }
  });

  // Mensajes
  socket.on("chat message", (msg) => {
    if (!users[socket.id]) return;

    const messageData = {
      nickname: users[socket.id].nickname,
      isAdmin: users[socket.id].isAdmin,
      message: msg,
      time: new Date().toLocaleTimeString()
    };

    chatHistory.push(messageData);
    saveHistory();

    io.emit("chat message", messageData);
  });

  // Borrado de historial
  socket.on("reset history", () => {
    chatHistory = [];
    saveHistory();
    io.emit("chat history", chatHistory);
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
    delete users[socket.id];
    io.emit("user list", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
