const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'stickers')));

const upload = multer({ dest: 'stickers/' });

app.get('/stickers', (req, res) => {
  fs.readdir(path.join(__dirname, 'stickers'), (err, files) => {
    if (err) return res.json([]);
    res.json(files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.gif')));
  });
});

app.post('/stickers', upload.single('sticker'), (req, res) => {
  res.json({ file: req.file.filename });
});

const HISTORY_FILE = path.join(__dirname, "chatHistory.json");
const ROLES_FILE = path.join(__dirname, "userRoles.json");

let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (err) {
    console.error("Error al leer historial:", err);
  }
}

let userRoles = {};
if (fs.existsSync(ROLES_FILE)) {
  try {
    userRoles = JSON.parse(fs.readFileSync(ROLES_FILE, "utf8"));
  } catch (err) {
    console.error("Error al leer roles:", err);
  }
}

let users = {};
let groups = {};

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (err) {
    console.error("Error al guardar historial:", err);
  }
}

function saveRoles() {
  try {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(userRoles, null, 2));
  } catch (err) {
    console.error("Error al guardar roles:", err);
  }
}

app.post("/reset", (req, res) => {
  const { token } = req.body;
  if (token !== process.env.RESET_TOKEN) {
    return res.status(403).send('Acceso denegado');
  }
  chatHistory = [];
  groups = {};
  saveHistory();
  io.emit("user list", Object.values(users));
  io.emit("group list", Object.keys(groups));
  console.log("⚠️ Chat reseteado manualmente");
  res.sendStatus(200);
});

io.on("connection", (socket) => {
  console.log("✔ Usuario conectado:", socket.id);

  socket.on("set nickname", (nickname) => {
    users[socket.id] = nickname;
    io.emit("user list", Object.values(users));
    socket.emit("chat history", chatHistory);
    socket.emit("group list", Object.keys(groups));
    socket.emit("your role", userRoles[nickname] || null);
  });

  socket.on("chat public", (msg) => {
    const isImage = typeof msg === "object" && msg.type === "image";
    const isAudio = typeof msg === "object" && msg.type === "audio";
    const message = {
      id: socket.id;
      name: users[socket.id],
      text: isImage || isAudio ? "" : msg,
      image: isImage ? msg.data : null,
      audio: isAudio ? msg.data : null,
      time: Date.now(),
      type: "public",
      target: null,
      isAdmin: userRoles[users[socket.id]] === "admin",
    };
    chatHistory.push(message);
    saveHistory();
    io.emit("chat message", message);
  });

  // (El resto del código para private, group, typing, create group, activate admin, disconnect es el mismo que en la versión anterior)

  socket.on("activate admin", ({ code }) => {
    if (code === process.env.ADMIN_CODE || code === "secretadmin123") {
      userRoles[users[socket.id]] = "admin";
      saveRoles();
      socket.emit("admin activated", { success: true });
    } else {
      socket.emit("admin activated", { success: false, message: "Código incorrecto" });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✔ Servidor chat listo en puerto ${PORT}`));
