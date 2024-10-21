var socket = io();

//id
var params = jQuery.deparam(window.location.search);
console.log(params);
let info = {};

//Tell server to start game if button is clicked
document.getElementById("start-game").addEventListener('click',()=>{
  socket.emit("startGame");
})

document.getElementById("end-game").addEventListener('click',()=>{
  window.location.href = "/";
})

//When host connects to server
socket.on("connect", function () {
  //Tell server that it is host connection
  socket.emit("host-join", params); //id
});

//display game info
socket.once("getGameInfo", function (data) {
  console.log("game info : ", data);
  displayGamePin(data.pin)
  info.quiz_type = data.quiz_type;
  info.time = data.time;
  info.no_mcq = data.no_mcq;
  info.no_buzzer = data.no_buzzer;
  info.marks = data.marks;

  //updating ui
  const infoDiv = document.querySelector(".info").innerHTML = "";  // Clear previous content;

  // Set quiz type and details
  if (info.quiz_type == 0) {
    addDetailsRow("Quiz Type", "Round 1 : MCQ");
    addDetailsRow("No of MCQs", info.no_mcq);
    addDetailsRow("Marking Scheme", `correct : ${data.marks.mcq_p}, incorrect : ${data.marks.mcq_n}`);
    addDetailsRow("Time for each question", `${info.time} sec`);
  } else if (info.quiz_type == 1) {
    addDetailsRow("Quiz Type", "Round 1 : BUZZER");
    addDetailsRow("No of Buzzers", info.no_buzzer);
    addDetailsRow("Marking Scheme", `correct : ${data.marks.buzzer_p}, incorrect : ${data.marks.buzzer_n}`);
  } else if (info.quiz_type == 2) {
    addDetailsRow("Quiz Type", "Round 1 : MCQ, Round 2 : BUZZER");
    addDetailsRow("No of MCQs", info.no_mcq);
    addDetailsRow("No of Buzzers", info.no_buzzer);
    addDetailsRow("Marking Scheme (MCQ)", `correct : ${data.marks.mcq_p}, incorrect : ${data.marks.mcq_n}`);
    addDetailsRow("Marking Scheme (BUZZER)", `correct : ${data.marks.buzzer_p}, incorrect : ${data.marks.buzzer_n}`);
    addDetailsRow("Time for each question", `${info.time} sec`);
  } else if (info.quiz_type == 3) {
    addDetailsRow("Quiz Type", "Round 1 : BUZZER, Round 2 : MCQ");
    addDetailsRow("No of Buzzers", info.no_buzzer);
    addDetailsRow("No of MCQs", info.no_mcq);
    addDetailsRow("Marking Scheme (BUZZER)", `correct : ${data.marks.buzzer_p}, incorrect : ${data.marks.buzzer_n}`);
    addDetailsRow("Marking Scheme (MCQ)", `correct : ${data.marks.mcq_p}, incorrect : ${data.marks.mcq_n}`);
    addDetailsRow("Time for each question", `${info.time} sec`);
  }

});

//Adds player's name to screen and updates player count
socket.on("updatePlayerLobby", function (data) {
  console.log("lobby ", data)
  document.querySelector(".players-in-room span").innerHTML = data.length
  document.querySelector(".players-list").innerHTML = "";

  for (var i = 0; i < data.length; i++) {
    document.querySelector(".players-list").innerHTML += `<p>${data[i]}</p>`;
  }
});


//When server starts the game
socket.on("gameStarted", function (id) {
  console.log("Game Started!");
  window.location.href = `/host/game/?id=${id}&quiz_type=${info.quiz_type}&mcq_p=${info.marks.mcq_p}&mcq_n=${-1 * info.marks.mcq_n}&buzzer_p=${info.marks.buzzer_p}&buzzer_n=${-1 * info.marks.buzzer_n}&no_mcq=${info.no_mcq}&no_buzzer=${info.no_buzzer}&db_id=${params.id}`;
});

socket.on("noGameFound", function () {
  window.location.href = "../../"; //Redirect user to 'join game' page
});

socket.on("error", function (message) {
  console.log("Error: " + message);
});


function displayGamePin(gamePin) {
  const pinDisplay = document.querySelector('.game-pin p');
  const lockIcon = document.querySelector('.fa-lock');
  const lockOpenIcon = document.querySelector('.fa-lock-open');

  // Initially, only the lock-open icon is visible
  lockOpenIcon.addEventListener('click', function () {
    pinDisplay.textContent = gamePin;

    // Hide lock-open and show lock icon
    lockOpenIcon.style.display = 'none';
    lockIcon.style.display = 'inline-block';
  });

  lockIcon.addEventListener('click', function () {
    // Change the pin display to the masked pin
    pinDisplay.textContent = "* * * * * *";

    // Show lock-open and hide lock icon
    lockIcon.style.display = 'none';
    lockOpenIcon.style.display = 'inline-block';
  });
}


function addDetailsRow(label, value) {
  const infoContainer = document.querySelector('.info');

  const detailsRow = document.createElement('div');
  detailsRow.classList.add('details-row');


  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;

  const valueSpan = document.createElement('span');
  valueSpan.textContent = value;

  detailsRow.appendChild(labelSpan);
  detailsRow.appendChild(valueSpan);

  infoContainer.appendChild(detailsRow);
}