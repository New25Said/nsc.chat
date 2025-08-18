const socket = io();
const messages = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const imageBtn = document.getElementById('image-btn');
const audioBtn = document.getElementById('audio-btn');
const stickerBtn = document.getElementById('sticker-btn');
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
const previewArea = document.getElementById('preview-area');
const previewImg = document.getElementById('preview-img');
const sendPreview = document.getElementById('send-preview');
const cancelPreview = document.getElementById('cancel-preview');
const stickerModal = document.getElementById('sticker-modal');
const stickerList = document.getElementById('sticker-list');
const uploadSticker = document.getElementById('upload-sticker');
let nickname = '';
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let currentImage = null;

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

messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    const text = messageInput.value.trim();
    if (text) {
      socket.emit('chat public', text);
      messageInput.value = '';
    }
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
        currentImage = reader.result;
        previewImg.src = currentImage;
        previewArea.style.display = 'flex';
      };
    }
  };
  input.click();
});

sendPreview.addEventListener('click', () => {
  if (currentImage) {
    socket.emit('chat public', { type: 'image', data: currentImage });
    previewArea.style.display = 'none';
    currentImage = null;
  }
});

cancelPreview.addEventListener('click', () => {
  previewArea.style.display = 'none';
  currentImage = null;
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

stickerBtn.addEventListener('click', () => {
  stickerModal.style.display = 'flex';
  loadStickers();
});

uploadSticker.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('sticker', file);
      fetch('/stickers', { method: 'POST', body: formData }).then(res => res.json()).then(data => {
        const url = `/stickers/${data.file}`;
        socket.emit('chat public', { type: 'image', data: url });
        stickerModal.style.display = 'none';
      });
    }
  };
  input.click();
});

function loadStickers() {
  fetch('/stickers').then(res => res.json()).then(files => {
    stickerList.innerHTML = '';
    if (files.length === 0) {
      // Placeholders si la carpeta está vacía
      const placeholders = [
        'https://www.freeiconspng.com/uploads/chat-icon-0.png',
        'https://www.freeiconspng.com/uploads/chat-icon-16.png',
        'https://www.freeiconspng.com/uploads/chat-icon-3.png',
        'https://www.freeiconspng.com/uploads/chat-icon-5.png',
        'https://www.freeiconspng.com/uploads/chat-icon-9.png'
      ];
      placeholders.forEach(url => addStickerImg(url));
    } else {
      files.forEach(file => addStickerImg(`/stickers/${file}`));
    }
  });
}

function addStickerImg(url) {
  const img = document.createElement('img');
  img.src = url;
  img.onclick = () => {
    socket.emit('chat public', { type: 'image', data: url });
    stickerModal.style.display = 'none';
  };
  stickerList.appendChild(img);
}

// (El resto del código para admin, groups, displayMessage es el mismo que antes)
