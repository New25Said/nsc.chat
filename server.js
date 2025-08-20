const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // tu frontend en /public

let messages = []; // mensajes guardados en memoria

io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado");

  // enviar historial al nuevo usuario
  socket.emit("chatHistory", messages);

  socket.on("chatMessage", (msg) => {
    const newMsg = {
      user: socket.id,
      text: msg,
      time: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    };
    messages.push(newMsg);

    // enviar a todos
    io.emit("chatMessage", newMsg);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado");
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
