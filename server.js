import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔴 Aquí pones tu cadena de conexión directo
const MONGO_URI = "mongodb+srv://USUARIO:CONTRASEÑA@cluster.mongodb.net/nsc-chat";

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, "public")));

// Conexión MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// Esquema y modelo de mensajes
const MessageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

// WebSockets
io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);

  // Mandar historial al nuevo usuario
  Message.find().sort({ timestamp: 1 }).then(messages => {
    socket.emit("chat-history", messages);
  });

  // Cuando alguien envía un mensaje
  socket.on("chat-message", async (msg) => {
    const message = new Message(msg);
    await message.save();
    io.emit("chat-message", message); // broadcast
  });

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado:", socket.id);
  });
});

// Render usa el puerto de env o 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
