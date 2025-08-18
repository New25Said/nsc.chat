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
      id: socket.id,
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

  socket.on("chat private", (msg) => {
    const target = msg.target;
    const targetId = Object.keys(users).find((id) => users[id] === target);
    if (targetId) {
      const isImage = msg.type === "image";
      const isAudio = msg.type === "audio";
      const message = {
        id: socket.id,
        name: users[socket.id],
        text: isImage || isAudio ? "" : msg.text,
        image: isImage ? msg.data : null,
        audio: isAudio ? msg.data : null,
        time: Date.now(),
        type: "private",
        target,
        isAdmin: userRoles[users[socket.id]] === "admin",
      };
      chatHistory.push(message);
      saveHistory();
      socket.emit("chat message", message);
      io.to(targetId).emit("chat message", message);
    }
  });

  socket.on("chat group", (msg) => {
    const groupName = msg.groupName;
    if (groups[groupName] && groups[groupName].includes(users[socket.id])) {
      const isImage = msg.type === "image";
      const isAudio = msg.type === "audio";
      const message = {
        id: socket.id,
        name: users[socket.id],
        text: isImage || isAudio ? "" : msg.text,
        image: isImage ? msg.data : null,
        audio: isAudio ? msg.data : null,
        time: Date.now(),
        type: "group",
        target: groupName,
        isAdmin: userRoles[users[socket.id]] === "admin",
      };
      chatHistory.push(message);
      saveHistory();
      Object.entries(users).forEach(([sid, nick]) => {
        if (groups[groupName].includes(nick)) {
          io.to(sid).emit("chat message", message);
        }
      });
    }
  });

  socket.on("create group", ({ groupName, members }) => {
    if (!groups[groupName] && members.length > 0) {
      groups[groupName] = members;
      io.emit("group list", Object.keys(groups));
    }
  });

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

  socket.on("activate admin", ({ code }) => {
    if (code === process.env.ADMIN_CODE || code === "secretadmin123") {
      userRoles[users[socket.id]] = "admin";
      saveRoles();
      socket.emit("admin activated", { success: true });
    } else {
      socket.emit("admin activated", { success: false, message: "Código incorrecto" });
    }
  });

  socket.on("disconnect", () => {
    console.log("✖ Usuario desconectado:", socket.id);
    delete users[socket.id];
    io.emit("user list", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✔ Servidor chat listo en puerto ${PORT}`));
