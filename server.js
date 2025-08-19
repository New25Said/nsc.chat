const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

io.on("connection", socket => {
  console.log("🔌 Usuario conectado");

  // mensaje público
  socket.on("chat public", msg => {
    io.emit("chat public", msg);
  });

  // mensaje privado
  socket.on("chat private", msg => {
    io.emit("chat private", msg);
  });

  // mensaje de grupo
  socket.on("chat group", msg => {
    io.emit("chat group", msg);
  });

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado");
  });
});

server.listen(3000, () => {
  console.log("🚀 Servidor en http://localhost:3000");
});
