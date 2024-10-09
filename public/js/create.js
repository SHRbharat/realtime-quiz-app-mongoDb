var socket = io();

socket.once("connect", function () {
  socket.emit("requestDbNames"); //Get database names to display to user
});

socket.once("gameNamesData", function (data) {
  console.log(data);
  if(!data){
    const p = document.createElement("p").textContent = "Sorry! No game found. Please create a new game"
    document.querySelector(".games-container").appendChild(p)
    return 
  }
  for (var i = 0; i < Object.keys(data).length; i++) {
    createGameItem(data[i].name ,data[i]._id)
  }
});

function startGame(data) {
  window.location.href = "/host/" + "?id=" + data;
}

socket.once("error", function (message) {
  console.log("Error: " + message);
  showToast("Some error occured!","error")
});

// Function to create and append game item
function createGameItem(gameName, id) {
  const gamesContainer = document.querySelector(".games-container");

  // Create the game item div
  const gameItem = document.createElement("div");
  gameItem.classList.add("game-item");
  gameItem.id = id;

  const gameNameElement = document.createElement("p");
  gameNameElement.textContent = `${gameName} `;

  const playIcon = document.createElement("i");
  playIcon.addEventListener('click',()=>startGame(id))
  playIcon.classList.add("fa-solid", "fa-play");

  gameNameElement.appendChild(playIcon);
  gameItem.appendChild(gameNameElement);
  gamesContainer.appendChild(gameItem);
}
