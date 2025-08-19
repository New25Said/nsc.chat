const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

// Guardamos usuarios conectados
let users = {}; // socket.id -> { nickname, admin }

io.on("connection", (socket) => {
  console.log("Un usuario se conectó:", socket.id);

  // Nickname
  socket.on("set nickname", (nickname) => {
    users[socket.id] = { nickname, admin: false };
    console.log(`Usuario ${nickname} conectado (${socket.id})`);
  });

  // Activar admin
  socket.on("become admin", () => {
    if (users[socket.id]) {
      users[socket.id].admin = true;
      console.log(`${users[socket.id].nickname} ahora es ADMIN`);
    }
  });

  // Crear grupo
  socket.on("create group", (groupName) => {
    if (users[socket.id]) {
      const msg = {
        user: users[socket.id].nickname,
        text: `ha creado el grupo "${groupName}"`,
        admin: users[socket.id].admin,
      };
      io.emit("chat message", msg);
      console.log(`Grupo creado: ${groupName} por ${users[socket.id].nickname}`);
    }
  });

  // Mensaje de chat
  socket.on("chat message", (text) => {
    if (users[socket.id]) {
      const msg = {
        user: users[socket.id].nickname,
        text,
        admin: users[socket.id].admin,
      };
      io.emit("chat message", msg);
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      console.log(`Usuario ${users[socket.id].nickname} se desconectó`);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
