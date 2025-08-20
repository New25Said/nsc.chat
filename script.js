const socket = io();
let nickname = "";

function enterChat() {
  nickname = document.getElementById("nickname").value.trim();
  if (!nickname) return alert("Pon un nickname");

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("chat-screen").style.display = "flex";
}

function sendMessage() {
  const input = document.getElementById("message-input");
  if (!input.value.trim()) return;

  const msg = {
    sender: nickname,
    text: input.value,
    timestamp: new Date()
  };

  socket.emit("chat-message", msg);
  input.value = "";
}

socket.on("chat-history", (messages) => {
  const container = document.getElementById("messages");
  container.innerHTML = "";
  messages.forEach(addMessage);
});

socket.on("chat-message", (msg) => {
  addMessage(msg);
});

function addMessage(msg) {
  const container = document.getElementById("messages");
  const div = document.createElement("div");

  div.classList.add("message");
  div.classList.add(msg.sender === nickname ? "self" : "other");
  div.innerHTML = `<b>${msg.sender}</b><br>${msg.text}`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
