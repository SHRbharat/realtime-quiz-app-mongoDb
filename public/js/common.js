//function to display confirmation box
function showConfirmationBox(message, confirmCallback, cancelCallback) {
  const confirmationBox = document.getElementById("confirmationBox");
  const messageElement = confirmationBox.querySelector(
    ".div-confirmation-message"
  );
  messageElement.textContent = message;

  confirmationBox.style.visibility = "visible";

  // Confirm button action
  const confirmButton = confirmationBox.querySelector(
    ".div-confirmation-confirm"
  );
  confirmButton.onclick = () => {
    confirmationBox.style.visibility = "hidden";
    if (confirmCallback) confirmCallback();
  };

  // Cancel button action
  const cancelButton = confirmationBox.querySelector(
    ".div-confirmation-cancel"
  );
  cancelButton.onclick = () => {
    confirmationBox.style.visibility = "hidden";
    if (cancelCallback) cancelCallback();
  };
}

// Example usage
// document.querySelector(".some-action").addEventListener("click", () => {
//     showConfirmationBox(
//       "Do you want to delete this item?",
//       () => console.log("Confirmed!"),
//       () => console.log("Cancelled!")
//     );
//   });

//function for displaying toast-notifications (type = success/error)
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");

  if (type === "success") {
    toast.classList.add("toast-success");
  } else if (type === "error") {
    toast.classList.add("toast-error");
  }

  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Add show class after a small delay to trigger CSS transition
  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  // Remove  after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");

    // Remove from DOM after transition
    setTimeout(() => {
      toast.remove();
    }, 500); // Wait for CSS transition to finish before removing
  }, 3000);
}

//logic for timer (executes a function after specified delay when timer runs out)
let timerInterval;
function startTimer(duration, callback = null, delayInSeconds = 0) {
  console.log("inside startTimer : ",duration)
  const timerElement = document.querySelector(".timer");
  const timeDisplay = document.getElementById("time-display");
  let timeLeft = duration;

  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timeDisplay.innerText = "0";

      // Execute the passed callback function after the given delay
      setTimeout(() => {
        callback();
      }, delayInSeconds * 1000); 

      return;
    }

    timeLeft--;
    const percentage = (timeLeft / duration) * 100;
    // console.log("timer ", timeLeft)
    // Update the timer text
    timeDisplay.innerText = timeLeft;

    // Update the circular border
    timerElement.style.background = `conic-gradient(#00ff00 ${percentage}%, #ff0000 ${percentage}%)`;
  }, 1000);
}

function stopTimer() {
  console.log("stopTimer() called , inside")
  clearInterval(timerInterval);
}


//leaderboard
const trophy = [
  { r: 2, c: "#d6a21e" ,photo :"bronze"},
  { r: 0, c: "#d6cd1e" ,photo :"gold"},
  { r: 1, c: "#bbbbbb" ,photo :"silver"}
];

function renderTopThree(topThree) {
  const topThreeCont = document.getElementById('topThreeCatsList');
  topThreeCont.innerHTML = '';

  // const topThreeCats = getTopThreeCats();
  topThree.forEach((player, index) => {
      const li = document.createElement('li');
      if(!player){
        li.innerHTML = `
            <div class="lead-cats">
                <img class="lead-cats__photo"
                    src="../../css/assets/${trophy[index].photo}.png">
                <div class="podium pod-${index + 1}">
                    <div class="ranking-lead" style="background-color: ${trophy[index].c}">
                        ${trophy[index].r + 1}
                    </div>
                    <h4>No Player</h4>
                    <p>0 points</p>
                </div>
            </div>
        `;
      }else{
        li.innerHTML = `
            <div class="lead-cats">
                <img class="lead-cats__photo ${player.name === newLeader ? 'active-leaderboard' : ''}"
                    src="../../css/assets/${trophy[index].photo}.png">
                <div class="podium pod-${index + 1}">
                    <div class="ranking-lead" style="background-color: ${trophy[index].c}">
                        ${trophy[index].r + 1}
                    </div>
                    <h4>${player.name}</h4>
                    <p>${player.score} points</p>
                </div>
            </div>
        `;
      }
      topThreeCont.appendChild(li);
  });
}

function renderAllPlayers(leaderboard) {
  const allPlayersList = document.getElementById('allCatsList');
  allPlayersList.innerHTML = '';

  leaderboard = leaderboard.filter(Boolean); // Remove undefined players

  leaderboard.forEach((player, index) => {
      const li = document.createElement('li');
      li.className = 'cat-item';
      li.innerHTML = `
          <div class="cat-item__photo">
              <div class="ranking" style="background-color: ${index < 3 ? trophy[index].c : '#1ca1fa'}">
                  ${index + 1}
              </div>
              <img src="../../css/assets/${trophy[index].photo}.png">
          </div>
          <div class="cat-item__info">
              <h4>${player.name}</h4>
          </div>
          <div class="cat-item__points">
              <p>${player.score}</p>
          </div>
      `;

      allCatsList.appendChild(li);
  });
}