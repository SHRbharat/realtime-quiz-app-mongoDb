var socket = io();

//Gets data from url (pin ,name)
var params = jQuery.deparam(window.location.search); 

let info = {};

//When player connects to server
socket.on("connect", function () {
  console.log(params);
  //Tell server that it is player connection
  socket.emit("player-join", params);
});

socket.on("getGameInfo", function (data) {
  console.log("game info : ", data);
  info.gameId = data.gameId;
  info.quiz_type = data.quiz_type;
  info.time = data.time;
  info.no_mcq = data.no_mcq;
  info.no_buzzer = data.no_buzzer
  info.marks = data.marks;
  
  //updating ui
  const infoDiv = document.querySelector(".info").innerHTML = "";  // Clear previous content;
  addDetailsRow('Player Name', params.name);

  // Add quiz type specific details
  if(info.quiz_type == 0){
    addDetailsRow('Quiz Type', 'Round 1: MCQ');
    addDetailsRow('No of MCQs', info.no_mcq);
    addDetailsRow('Marking Scheme', `Correct: ${data.marks.mcq_p}, Incorrect: ${data.marks.mcq_n}`);
    addDetailsRow('Time for each question', `${info.time} sec`);
  } else if(info.quiz_type == 1){
    addDetailsRow('Quiz Type', 'Round 1: BUZZER');
    addDetailsRow('No of Buzzers', info.no_buzzer);
    addDetailsRow('Marking Scheme', `Correct: ${data.marks.buzzer_p}, Incorrect: ${data.marks.buzzer_n}`);
  } else if(info.quiz_type == 2){
    addDetailsRow('Quiz Type', 'Round 1: MCQ, Round 2: BUZZER');
    addDetailsRow('No of MCQs', info.no_mcq);
    addDetailsRow('No of Buzzers', info.no_buzzer);
    addDetailsRow('Marking Scheme (MCQ)', `Correct: ${data.marks.mcq_p}, Incorrect: ${data.marks.mcq_n}`);
    addDetailsRow('Marking Scheme (BUZZER)', `Correct: ${data.marks.buzzer_p}, Incorrect: ${data.marks.buzzer_n}`);
    addDetailsRow('Time for each question', `${info.time} sec`);
  } else if(info.quiz_type == 3){
    addDetailsRow('Quiz Type', 'Round 1: BUZZER, Round 2: MCQ');
    addDetailsRow('No of Buzzers', info.no_buzzer);
    addDetailsRow('No of MCQs', info.no_mcq);
    addDetailsRow('Marking Scheme (BUZZER)', `Correct: ${data.marks.buzzer_p}, Incorrect: ${data.marks.buzzer_n}`);
    addDetailsRow('Marking Scheme (MCQ)', `Correct: ${data.marks.mcq_p}, Incorrect: ${data.marks.mcq_n}`);
    addDetailsRow('Time for each question', `${info.time} sec`);
  }

  
});

//Boot player back to join screen if game pin has no match
socket.on("noGameFound", function () {
  window.location.href = "../";
});
//If the host disconnects, then the player is booted to main screen
socket.on("hostDisconnect", function () {
  window.location.href = "../";
});

//When the host clicks start game, the player screen changes
socket.on("gameStartedPlayer", function () {
  window.location.href = `/player/game/?id=${socket.id}&quiz_type=${info.quiz_type}&mcq_p=${info.marks.mcq_p}&mcq_n=${info.marks.mcq_n}&buzzer_p=${info.marks.buzzer_p}&buzzer_n=${info.marks.buzzer_n}&no_mcq=${info.no_mcq}&no_buzzer=${info.no_buzzer}&db_id=${info.gameId}`;
});

socket.on("error", function (message) {
  console.log("Error: " + message);
});


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