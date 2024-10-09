var socket = io();

const pinInput = document.getElementById("pin");
const nameInput = document.getElementById("name");
const joinButton = document.getElementById("joinButton");
let pinValid = false;

pinInput.addEventListener("focusout", () => {
  const gamePin = pinInput.value;

  // Emit event to the server to check if the game exists
  socket.emit("check_game_pin", gamePin);
});

nameInput.addEventListener("focusout", () => {
  if(nameInput.value.length > 2 && nameInput.value.length < 50 && pinValid){
    showToast("Name is Valid , Now you can join the game!")
    joinButton.disabled = false
  }else{
    showToast("Either pin or name is invalid!","error")
    joinButton.disabled = true
  }
});


socket.on("game_pin_status", (data) => {
  if (data.exists) {
    pinValid = true
    // joinButton.disabled = false; // Enable join button if the game exists
    showToast("Game pin is correct!")
  } else {
    joinButton.disabled = true; // Keep the button disabled
    showToast("Game with this pin does not exist!" , "error");
  }
});



document.addEventListener('DOMContentLoaded', () => {
  const images = ['css/assets/slide1.png', 'css/assets/slide2.png', 'css/assets/slide3.png'];
  let currentImageIndex = 0;

  // Simple image slider
  setInterval(() => {
    // console.log(images[currentImageIndex])
      currentImageIndex = (currentImageIndex + 1) % images.length;
      document.getElementById('slideImage').src = images[currentImageIndex];
  }, 3000);

});

document.getElementById("createGame").addEventListener('click',()=>{
  window.location.href = "create/quiz-creator/"
})