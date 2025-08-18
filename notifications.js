const notificationSound = new Audio("https://ia801505.us.archive.org/10/items/hangouts_sfx/hangouts_message.mp3");

if (typeof socket !== "undefined") {
  socket.on("chat message", msg => {
    if (msg.name !== nickname && document.hidden) {
      notificationSound.play().catch(() => {});
    }
  });
}