const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

const HISTORY_FILE = path.join(__dirname, "chatHistory.json");
const ADMINS_FILE = path.join(__dirname, "admins.json");

// Historial
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (err) {
    console.error("Error al leer historial:", err);
  }
}

// Admins persistentes
let admins = {};
if (fs.existsSync(ADMINS_FILE)) {
  try {
    admins = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf8"));
  } catch (err) {
    console.error("Error leyendo admins:", err);
  }
}

// Usuarios y grupos
let users = {}; // socket.id -> nickname
let groups = {}; // groupName -> [nicknames]

// Guardar historial
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
}

// Guardar admins
function saveAdmins() {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

// Reset de chat y grupos
app.post("/reset", (req, res) => {
  chatHistory = [];
  saveHistory();
  groups = {};
  io.emit("user list", Object.values(users));
  io.emit("group list", Object.keys(groups));
  console.log("⚡ Chat reseteado manualmente");
  res.sendStatus(200);
});

io.on("connection", (socket) => {
  console.log("✅ Usuario conectado:", socket.id);

  // Establecer nickname
  socket.on("set nickname", (nickname) => {
    users[socket.id] = nickname;
    io.emit("user list", Object.values(users));
    socket.emit("chat history", chatHistory);
    socket.emit("group list", Object.keys(groups));

    // Enviar estado admin si corresponde
    if (admins[nickname]) {
      socket.emit("admin update", nickname);
      console.log(`🔑 ${nickname} se reconecta como ADMIN`);
    }
  });

  // Código ADMIN
  socket.on("set admin", (code) => {
    const ADMIN_CODE = "coolkid-admin"; // <-- tu código secreto
    const nickname = users[socket.id];
    if (code === ADMIN_CODE && nickname && !admins[nickname]) {
      admins[nickname] = true;
      saveAdmins();

      io.emit("admin update", nickname);
      console.log(`✅ ${nickname} es ahora ADMIN`);

      // Crear mensaje normal en chat general
      const adminMessage = {
        id: socket.id,
        name: nickname,
        text: `${nickname} se ha vuelto admin!`,
        image: null,
        time: Date.now(),
        type: "public",
        target: null,
        isAdmin: true
      };

      chatHistory.push(adminMessage);
      saveHistory();
      io.emit("chat message", adminMessage);
    }
  });

  // Crear mensaje con propiedad isAdmin
  function createMessage(msg, type, target = null) {
    const nickname = users[socket.id];
    const isImage = typeof msg === "object" && msg.type === "image";
    return {
      id: socket.id,
      name: nickname,
      text: isImage ? "" : (type === "public" ? msg : msg.text),
      image: isImage ? msg.data : null,
      time: Date.now(),
      type,
      target,
      isAdmin: admins[nickname] || false
    };
  }

  // Mensajes públicos
  socket.on("chat public", (msg) => {
    const message = createMessage(msg, "public");
    chatHistory.push(message);
    saveHistory();
    io.emit("chat message", message);
  });

  // Mensajes privados
  socket.on("chat private", (msg) => {
    const target = msg.target;
    const targetId = Object.keys(users).find((id) => users[id] === target);
    if (targetId) {
      const message = createMessage(msg, "private", target);
      chatHistory.push(message);
      saveHistory();
      socket.emit("chat message", message);
      io.to(targetId).emit("chat message", message);
    }
  });

  // Mensajes de grupo
  socket.on("chat group", (msg) => {
    const groupName = msg.groupName;
    if (groups[groupName] && groups[groupName].includes(users[socket.id])) {
      const message = createMessage(msg, "group", groupName);
      chatHistory.push(message);
      saveHistory();
      Object.entries(users).forEach(([sid, nick]) => {
        if (groups[groupName].includes(nick)) {
          io.to(sid).emit("chat message", message);
        }
      });
    }
  });

  // Crear grupo
  socket.on("create group", ({ groupName, members }) => {
    if (!groups[groupName]) {
      groups[groupName] = members;
      io.emit("group list", Object.keys(groups));
    }
  });

  // Indicador escribiendo
  socket.on("typing", ({ type, target }) => {
    if (type === "public") {
      socket.broadcast.emit("typing", { name: users[socket.id], type, target: null });
    } else if (type === "private" && target) {
      const targetId = Object.keys(users).find((id) => users[id] === target);
      if (targetId) io.to(targetId).emit("typing", { name: users[socket.id], type, target });
    } else if (type === "group" && target) {
      groups[target].forEach((nick) => {
        const sid = Object.keys(users).find((id) => users[id] === nick);
        if (sid && sid !== socket.id) io.to(sid).emit("typing", { name: users[socket.id], type, target });
      });
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado:", socket.id);
    delete users[socket.id];
    io.emit("user list", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Servidor chat listo en puerto ${PORT}`));
