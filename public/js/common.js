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
function startTimer(duration, callback, delayInSeconds) {
  console.log("inside startTimer : ")
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
    console.log("timer ", timeLeft)
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
