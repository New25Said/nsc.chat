// notifications.js

// URL del sonido de notificación
const notificationSound = new Audio("https://ia801505.us.archive.org/10/items/hangouts_sfx/hangouts_message.mp3");

// Escuchar nuevos mensajes del socket
if (typeof socket !== "undefined") {
  socket.on("chat message", msg => {
    // Reproducir sonido solo si el mensaje NO es tuyo
    // y la pestaña está en segundo plano
    if (msg.name !== nickname && document.hidden) {
      notificationSound.play().catch(() => {});
    }
  });
}
