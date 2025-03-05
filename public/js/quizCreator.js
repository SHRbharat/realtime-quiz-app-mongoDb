var socket = io();

let fileFormatValid = false;
let containsMedia = { image: 0, audio: 0 };
let mediaValid = { image: false, audio: false };
let gameId = "12345";
const mcq_arr = [];
const buzzer_arr = [];

//temporary
// document.querySelector(".info-btn").addEventListener('click',openPopup);
document.getElementById("gameId").value = gameId

document
  .getElementById("create-room-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();
  });

document.getElementById("file-picker").addEventListener("change", () => {
  validateFileFormat();
});

document.getElementById("create-quiz").addEventListener("click", async () => {
  updateDatabase();
});

function updateDatabase() {
  const name = document.getElementById("name").value;
  const quiz_type = 1 * document.getElementById("quiz-type").selectedIndex;
  const time = 1 * document.getElementById("time").value;
  const marks = {
    mcq_p: 1 * document.getElementById("mcq-positive").value,
    mcq_n: -1 * document.getElementById("mcq-negative").value,
    buzzer_p: 1 * document.getElementById("buzzer-positive").value,
    buzzer_n: -1 * document.getElementById("buzzer-negative").value,
  };

  const data = {
    name,
    quiz_type,
    time,
    marks,
    mcq_arr,
    buzzer_arr,
  };
  console.log(data);
  try {
    socket.emit("newQuiz", data);
    showToast("Data saved successfully. Upload Media")
  } catch (error) {
    showToast("Error while saving data","error")
    console.error(error);
  }
}

//game created , now upload the media files if present
socket.once("gameId", (id) => {
  console.log("game id:",id)
  if (fileFormatValid && (containsMedia.image > 0 || containsMedia.audio > 0)) {
    openPopup();
    gameId = id;
    document.querySelector(".popup-window #gameId").value = gameId;
    // if (containsMedia.image === 0) {
    //   document
    //     .querySelector("#media-form .input-grp:first-child")
    //     .classList.add("disabled");
    //   const imagePicker = document.querySelector("#image-picker");
    //   imagePicker.disabled = true;
    //   imagePicker.removeAttribute("required");
    //   imagePicker.classList.add("disabled");
    // }
    // if (containsMedia.audio === 0) {
    //   document
    //     .querySelector("#media-form .input-grp:nth-child(2)")
    //     .classList.add("disabled");
    //   const audioPicker = document.querySelector("#audio-picker");
    //   audioPicker.disabled = true;
    //   audioPicker.removeAttribute("required");
    //   audioPicker.classList.add("disabled");
    // }
  }
});

//send host to his lobby screen , starting the game
// socket.on("startGameFromCreator", function (id) {
//   console.log("redirecting : ", id);
//   setTimeout(function () {
//     window.location.href = "../../host/?id=" + id;
//   }, 5000);
// });

//Called when user wants to exit quiz creator
function cancelQuiz() {
  if (confirm("Are you sure you want to exit? All work will be DELETED!")) {
    window.location.href = "../";
  }
}

socket.on("error", function (message) {
  showToast("Some Error Occured", "error");
  console.log("Error: " + message);
});

function validateFileFormat() {
  console.log("Reading file--->");
  containsMedia = { image: 0, audio: 0 };

  const fileInput = document.getElementById("file-picker");
  const file = fileInput.files[0];

  if (!file) {
    console.log("No file selected");
    showToast("No file selected", "error");
    return;
  }

  if (!["application/json", "text/plain"].includes(file.type)) {
    console.log("Invalid file");
    showToast("Invalid file", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);
      if (!Array.isArray(data)) {
        throw new Error("Invalid format: Root element should be an array.");
      }

      // Validate each item
      data.forEach((item, index) => {
        if (item.type === "mcq") {
          if (
            !item.que_en ||
            !item.que_hi ||
            !item.op1 ||
            !item.op2 ||
            !item.op3 ||
            !item.op4 ||
            item.correct === undefined
          ) {
            throw new Error(
              `Invalid MCQ format at index ${index}: Missing required fields.`
            );
          }
        } else if (item.type === "buzzer") {
          if (!item.que_en || !item.que_hi || !item.correct) {
            throw new Error(
              `Invalid Buzzer format at index ${index}: Missing required fields.`
            );
          }
        } else {
          throw new Error(
            `Invalid type at index ${index}: Must be "mcq" or "buzzer".`
          );
        }

        // Validate media
        if (item.media) {
          const mediaKeys = Object.keys(item.media);
          if (mediaKeys.length > 1) {
            throw new Error(
              `Invalid media format at index ${index}: Only one media type (image or audio) is allowed.`
            );
          }
          if (mediaKeys[0] === "image") {
            containsMedia.image++;
          } else if (mediaKeys[0] === "audio") {
            containsMedia.audio++;
          } else {
            throw new Error(
              `Invalid media type at index ${index}: Must be either "image" or "audio".`
            );
          }
        }
      });

      //if valid push to array
      data.forEach((item) => {
        if (item.type === "mcq") {
          mcq_arr.push(item);
        } else if (item.type === "buzzer") {
          buzzer_arr.push(item);
        }
      });

      fileFormatValid = true;
      showToast("File Validated Successfully!");
      // console.log("MCQ Array:", mcq_arr);
      // console.log("Buzzer Array:", buzzer_arr);
      console.log(containsMedia);
    } catch (error) {
      console.log(`Error: ${error.message}`);
      showToast(error.message, "error");
    }
  };

  reader.onerror = function () {
    console.log("Error reading file");
    showToast("Error reading file");
  };

  reader.readAsText(file);
}

// Show Popup Functionality
const popupOverlay = document.getElementById("popup-overlay");

// Image and Audio Pickers
const imagePicker = document.getElementById("image-picker");
const audioPicker = document.getElementById("audio-picker");

// Preview Containers
const imagePreview = document.getElementById("image-preview");
const audioPreview = document.getElementById("audio-preview");

// Open popup
function openPopup() {
  popupOverlay.classList.remove("hidden");

  document
    .querySelector("#media-form .input-grp:first-child")
    .classList.remove("disabled");
  const imagePicker = document.querySelector("#image-picker");
  imagePicker.disabled = false;
  imagePicker.required = true;
  imagePicker.classList.remove("disabled");

  document
    .querySelector("#media-form .input-grp:nth-child(1)")
    .classList.remove("disabled");
  const audioPicker = document.querySelector("#audio-picker");
  audioPicker.disabled = false;
  audioPicker.required = true;
  audioPicker.classList.remove("disabled");
}

// Preview Images and Audios
imagePicker.addEventListener("change", (event) => {
  previewFiles(event.target.files, imagePreview, "image");
});

audioPicker.addEventListener("change", (event) => {
  previewFiles(event.target.files, audioPreview, "audio");
});

//close popup
document.getElementById("cancel-media").addEventListener("click", () => {
  popupOverlay.classList.add("hidden");
  clearPreviews(); // Clear preview on close
});

// Handle Submit (trigger toast)
// document.getElementById("submit-media").addEventListener("click", (e) => {
//   // e.preventDefault();

//   showToast("Media submitted successfully!");
//   // popupOverlay.classList.add("hidden");
//   // clearPreviews(); // Clear preview on close
// });

function previewFiles(files, previewElement, type) {
  previewElement.innerHTML = ""; // Clear previous preview
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileElement = document.createElement(
        type === "image" ? "img" : "audio"
      );
      fileElement.src = e.target.result;
      if (type === "audio") fileElement.controls = true; // Audio needs controls
      previewElement.appendChild(fileElement);
    };
    reader.readAsDataURL(file);
  });
}

// Clear previews
function clearPreviews() {
  imagePicker.value = "";
  audioPicker.value = "";
  imagePreview.innerHTML = "";
  audioPreview.innerHTML = "";
}

//check form validity
const form = document.getElementById("create-room-form");
const quizTitle = document.getElementById("name");
const quizType = document.getElementById("quiz-type");
const filePicker = document.getElementById("file-picker");
const time = document.getElementById("time");
const mcqPositive = document.getElementById("mcq-positive");
const mcqNegative = document.getElementById("mcq-negative");
const buzzerPositive = document.getElementById("buzzer-positive");
const buzzerNegative = document.getElementById("buzzer-negative");
const createQuizButton = document.getElementById("create-quiz");

// Helper function to check if all fields are filled
function checkFormValidity() {
  const allFieldsFilled =
    quizTitle.value.trim() !== "" &&
    quizType.value !== "" &&
    time.value.trim() !== "" &&
    mcqPositive.value.trim() !== "" &&
    mcqNegative.value.trim() !== "" &&
    buzzerPositive.value.trim() !== "" &&
    buzzerNegative.value.trim() !== "" &&
    time.value >= 10 &&
    time.value <= 300 &&
    fileFormatValid;

  createQuizButton.disabled = !allFieldsFilled;
}

// Attach event listeners to all fields to check form validity on change
form.addEventListener("input", checkFormValidity);


//handling media-form submission
const mediaForm = document.getElementById('media-form');
mediaForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const formData = new FormData(mediaForm);

  for (let [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }

  // Send form data via fetch
  fetch('/upload', {
      method: 'POST',
      body: formData,
  })
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to upload files');
          }
          return response.text(); // Parse response as text
      })
      .then(data => {
          // Log the success message and display it
          console.log('Files uploaded successfully:', data);
          showToast("Media submitted successfully!");

          //close popup
          popupOverlay.classList.add("hidden");
          clearPreviews(); // Clear preview on close
      })
      .catch(error => {
          // Handle errors
          console.error('Error uploading files:', error);
          showToast("Failed to upload!", "error");
      });
});



//validate and read the file
// document.getElementById("file-picker").addEventListener("change", function () {
//   console.log("Reading file--->");
//   const fileInput = document.getElementById("file-picker");
//   const file = fileInput.files[0];

//   if (!file) {
//     console.log("No file selected");
//     // showToast("No file selected");
//     return;
//   }

//   if (!["application/json", "text/plain"].includes(file.type)) {
//     console.log("Invalid file");
//     // showToast("Invalid file");
//     return;
//   }

//   const reader = new FileReader();

//   reader.onload = function (event) {
//     try {
//       const data = JSON.parse(event.target.result);
//       if (!Array.isArray(data)) {
//         throw new Error("Invalid format: Root element should be an array.");
//       }

//       // Validate each item
//       data.forEach((item) => {
//         if (item.type === "mcq") {
//           if (
//             !item.que_en ||
//             !item.que_hi ||
//             !item.op1 ||
//             !item.op2 ||
//             !item.op3 ||
//             !item.op4 ||
//             item.correct === undefined
//           ) {
//             throw new Error("Invalid MCQ format: Missing required fields.");
//           }
//         } else if (item.type === "buzzer") {
//           if (!item.que_en || !item.que_hi || !item.correct) {
//             throw new Error("Invalid Buzzer format: Missing required fields.");
//           }
//         } else {
//           throw new Error('Invalid type: Must be "mcq" or "buzzer".');
//         }
//       });

//       // If all items are valid, populate
//       data.forEach((item) => {
//         if (item.type === "mcq") {
//           mcq_arr.push(item);
//         } else if (item.type === "buzzer") {
//           buzzer_arr.push(item);
//         }
//       });

//     //   showSuccessToast("File Validated Successfully!");
//       console.log("MCQ Array:", mcq_arr);
//       console.log("Buzzer Array:", buzzer_arr);
//     } catch (error) {
//       console.log(`Error: ${error.message}`);
//     //   showToast(error.message);
//     }
//   };

//   reader.onerror = function () {
//     console.log("Error reading file");
//     // showToast("Error reading file");
//   };

//   reader.readAsText(file);
// });
