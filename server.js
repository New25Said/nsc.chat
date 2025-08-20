require('dotenv').config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Conectar MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log(err));

// Esquemas
const UserSchema = new mongoose.Schema({
  nickname: String,
  online: Boolean
});
const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  time: String
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

// Registro/Login solo con nickname
app.post("/login", async (req,res)=>{
  const { nickname } = req.body;
  let user = await User.findOne({ nickname });
  if(!user){
    user = new User({ nickname, online:true });
    await user.save();
  } else {
    user.online = true;
    await user.save();
  }
  res.send({ success:true, nickname: user.nickname });
});

// Obtener mensajes
app.get("/messages/:nickname", async (req,res)=>{
  const { nickname } = req.params;
  const msgs = await Message.find({ $or:[ {from:nickname},{to:nickname} ] });
  res.send(msgs);
});

// Socket.IO
io.on("connection", socket=>{
  console.log("Usuario conectado", socket.id);

  socket.on("chat message", async (data)=>{
    const message = new Message(data);
    await message.save();
    io.emit("chat message", data);
  });

  socket.on("disconnect", ()=>{ console.log("Usuario desconectado", socket.id); });
});

server.listen(process.env.PORT || 3000, ()=>console.log("Servidor corriendo en http://localhost:" + (process.env.PORT || 3000)));
