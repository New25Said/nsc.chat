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
const createGroupBtn = document.getElementById('create-group-btn');
const groupModal = document.getElementById('group-modal');
const groupNameInput = document.getElementById('group-name');
const userList = document.getElementById('user-list');
const submitGroup = document.getElementById('submit-group');
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
  } else {
    alert('Por favor, ingresa un apodo válido');
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      audioBtn.textContent = '⏹️';
      isRecording = true;
    } catch (err) {
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
      console.error('Error en audio:', err);
    }
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

createGroupBtn.addEventListener('click', () => {
  groupModal.style.display = 'flex';
  socket.emit('request user list');
});

submitGroup.addEventListener('click', () => {
  const groupName = groupNameInput.value.trim();
  const selectedUsers = Array.from(userList.querySelectorAll('input:checked')).map(input => input.value);
  if (groupName && selectedUsers.length > 0) {
    socket.emit('create group', { groupName, members: selectedUsers });
    groupModal.style.display = 'none';
    groupNameInput.value = '';
    userList.innerHTML = '';
  } else {
    alert('Por favor, ingresa un nombre de grupo y selecciona al menos un miembro');
  }
});

socket.on('user list', (users) => {
  userList.innerHTML = '';
  users.forEach(user => {
    if (user !== nickname) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${user}"> ${user}`;
      userList.appendChild(label);
    }
  });
});

socket.on('chat message', (msg) => {
  displayMessage(msg);
});

socket.on('chat history', (history) => {
  history.forEach(displayMessage);
});

socket.on('admin activated', ({ success, message }) => {
  alert(success ? '¡Admin activado!' : message || 'Código incorrecto');
});

socket.on('group list', (groups) => {
  const chatList = document.getElementById('chat-list');
  chatList.innerHTML = '<li class="public">General</li>';
  groups.forEach(group => {
    const li = document.createElement('li');
    li.classList.add('group');
    li.textContent = group;
    chatList.appendChild(li);
  });
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
