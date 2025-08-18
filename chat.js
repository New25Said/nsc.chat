const socket = io();
const messages = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const imageBtn = document.getElementById('image-btn');
const audioBtn = document.getElementById('audio-btn');
const nicknameModal = document.getElementById('nickname-modal');
const nicknameInput = document.getElementById('nickname-input');
const joinBtn = document.getElementById('join-btn');
const adminBtn = document.getElementById('admin-btn');
const adminModal = document.getElementById('admin-modal');
const adminCode = document.getElementById('admin-code');
const submitAdmin = document.getElementById('submit-admin');
let nickname = '';
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

const savedNickname = localStorage.getItem('nickname');
if (savedNickname) {
  nickname = savedNickname;
  socket.emit('set nickname', nickname);
  nicknameModal.style.display = 'none';
} else {
  nicknameModal.style.display = 'flex';
}

joinBtn.addEventListener('click', () => {
  nickname = nicknameInput.value.trim();
  if (nickname) {
    localStorage.setItem('nickname', nickname);
    socket.emit('set nickname', nickname);
    nicknameModal.style.display = 'none';
  }
});

sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (text) {
    socket.emit('chat public', text);
    messageInput.value = '';
  }
});

imageBtn.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        socket.emit('chat public', { type: 'image', data: reader.result });
      };
    }
  };
  input.click();
});

audioBtn.addEventListener('click', async () => {
  if (!isRecording) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    audioBtn.textContent = '⏹️';
    isRecording = true;
  } else {
    mediaRecorder.stop();
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        socket.emit('chat public', { type: 'audio', data: reader.result });
      };
      audioBtn.textContent = '🎤';
      isRecording = false;
    };
  }
});

adminBtn.addEventListener('click', () => {
  adminModal.style.display = 'flex';
});

submitAdmin.addEventListener('click', () => {
  socket.emit('activate admin', { code: adminCode.value });
  adminModal.style.display = 'none';
  adminCode.value = '';
});

socket.on('chat message', (msg) => {
  displayMessage(msg);
});

socket.on('chat history', (history) => {
  history.forEach(displayMessage);
});

socket.on('admin activated', (isAdmin) => {
  if (isAdmin) {
    alert('¡Admin activado!');
  } else {
    alert('Código incorrecto');
  }
});

function displayMessage(msg) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', msg.name === nickname ? 'you' : 'other');

  const nameSpan = document.createElement('span');
  nameSpan.classList.add('name');
  nameSpan.textContent = msg.name;
  if (msg.isAdmin) {
    const badge = document.createElement('span');
    badge.classList.add('admin-badge');
    badge.textContent = ' A⋆d⋆m⋆i⋆n';
    nameSpan.appendChild(badge);
  }
  messageDiv.appendChild(nameSpan);

  if (msg.text) {
    const textSpan = document.createElement('span');
    textSpan.classList.add('text');
    textSpan.textContent = msg.text;
    messageDiv.appendChild(textSpan);
  } else if (msg.image) {
    const img = document.createElement('img');
    img.src = msg.image;
    img.classList.add('chat-image');
    messageDiv.appendChild(img);
  } else if (msg.audio) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = msg.audio;
    messageDiv.appendChild(audio);
  }

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('time');
  timeSpan.textContent = new Date(msg.time).toLocaleTimeString();
  messageDiv.appendChild(timeSpan);

  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}