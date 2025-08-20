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

const HISTORY_FILE = path.join(__dirname,"chatHistory.json");
const ADMINS_FILE = path.join(__dirname,"admins.json");

let chatHistory = [];
if(fs.existsSync(HISTORY_FILE)) chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE,"utf8"));

let admins = {};
if(fs.existsSync(ADMINS_FILE)) admins = JSON.parse(fs.readFileSync(ADMINS_FILE,"utf8"));

let users = {};
let groups = {};

function saveHistory(){ fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory,null,2)); }
function saveAdmins(){ fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins,null,2)); }

app.post("/reset",(req,res)=>{
  chatHistory=[]; saveHistory(); groups={};
  io.emit("user list", Object.values(users));
  io.emit("group list", Object.keys(groups));
  res.sendStatus(200);
});

io.on("connection",(socket)=>{
  socket.on("set nickname", (nickname)=>{
    users[socket.id] = nickname;
    io.emit("user list", Object.values(users));
    socket.emit("chat history", chatHistory);
    socket.emit("group list", Object.keys(groups));
    if(admins[nickname]) socket.emit("admin update", nickname);
  });

  socket.on("set admin", (code)=>{
    const ADMIN_CODE="coolkid-admin";
    const nickname = users[socket.id];
    if(code===ADMIN_CODE && nickname){
      admins[nickname]=true;
      saveAdmins();
      io.emit("admin update", nickname);
    }
  });

  function createMessage(msg, type, target=null){
    const nickname = users[socket.id];
    const message = {
      id: socket.id,
      name: nickname,
      text: msg.text || "",
      type,
      target,
      time: Date.now(),
      isAdmin: admins[nickname]||false
    };
    if(msg.type==="file"){
      message.type="file";
      message.fileName = msg.fileName;
      message.fileType = msg.fileType;
      message.extension = msg.extension;
      message.data = msg.data;
    }
    if(msg.image) message.image = msg.image;
    return message;
  }

  socket.on("chat public", (msg)=>{
    const message = createMessage(msg,"public");
    chatHistory.push(message);
    saveHistory();
    io.emit("chat message", message);
  });

  socket.on("chat private", (msg)=>{
    const target = msg.target;
    const targetId = Object.keys(users).find(id => users[id]===target);
    if(targetId){
      const message = createMessage(msg,"private", target);
      chatHistory.push(message);
      saveHistory();
      socket.emit("chat message", message);
      io.to(targetId).emit("chat message", message);
    }
  });

  socket.on("chat group", (msg)=>{
    const groupName = msg.groupName;
    if(groups[groupName] && groups[groupName].includes(users[socket.id])){
      const message = createMessage(msg,"group", groupName);
      chatHistory.push(message);
      saveHistory();
      Object.entries(users).forEach(([sid,nick])=>{
        if(groups[groupName].includes(nick)) io.to(sid).emit("chat message", message);
      });
    }
  });

  socket.on("create group", ({groupName,members})=>{
    if(!groups[groupName]){
      groups[groupName]=members;
      io.emit("group list", Object.keys(groups));
    }
  });

  socket.on("typing", ({type,target})=>{
    if(type==="public") socket.broadcast.emit("typing",{name:users[socket.id],type,target:null});
    else if(type==="private" && target){
      const targetId = Object.keys(users).find(id=>users[id]===target);
      if(targetId) io.to(targetId).emit("typing",{name:users[socket.id],type,target});
    } else if(type==="group" && target){
      groups[target].forEach(nick=>{
        const sid = Object.keys(users).find(id=>users[id]===nick);
        if(sid && sid!==socket.id) io.to(sid).emit("typing",{name:users[socket.id],type,target});
      });
    }
  });

  socket.on("disconnect", ()=>{
    delete users[socket.id];
    io.emit("user list", Object.values(users));
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Servidor chat listo en puerto ${PORT}`));
