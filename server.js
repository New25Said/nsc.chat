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
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (err) {
    console.error("Error cargando historial:", err);
    chatHistory = [];
  }
}

// Guardar historial
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2), "utf8");
}

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Enviar historial al nuevo usuario
  socket.emit("chat history", chatHistory);

  // Guardar nickname
  socket.on("set nickname", (nickname) => {
    socket.nickname = nickname;
  });

  // Activar admin
  socket.on("set admin", () => {
    socket.isAdmin = true;
    io.emit("update user admin", { id: socket.id, isAdmin: true });
  });

  // Mensaje
  socket.on("chat message", (msg) => {
    if (!socket.nickname) return;
    const messageData = {
      user: socket.nickname,
      text: msg,
      timestamp: new Date().toISOString(),
      isAdmin: socket.isAdmin || false
    };
    chatHistory.push(messageData);
    saveHistory();
    io.emit("chat message", messageData);
  });

  // Resetear historial
  socket.on("reset history", () => {
    chatHistory = [];
    saveHistory();
    io.emit("chat history", []);
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
