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

// 🔴 Conexión Mongo directa (pon tu usuario y pass)
const MONGO_URI = "mongodb+srv://USUARIO:CONTRASEÑA@cluster.mongodb.net/nsc-chat";

app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

const MessageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", MessageSchema);

io.on("connection", (socket) => {
  console.log("🟢 Usuario conectado:", socket.id);

  Message.find().sort({ timestamp: 1 }).then(messages => {
    socket.emit("chat-history", messages);
  });

  socket.on("chat-message", async (msg) => {
    const message = new Message(msg);
    await message.save();
    io.emit("chat-message", message);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Usuario desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
