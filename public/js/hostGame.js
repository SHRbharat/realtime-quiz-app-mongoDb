var socket = io();
//marks are all positive
//Gets {id,quiz_type,mcq_p,mcq_n,buzzer_p,buzzer_n,no_mcq,no_buzzer} from url
var params = jQuery.deparam(window.location.search); 

//player to buzzer first
let buzzerPlayer = null;
let correctAns = null;
let currQuesType = null;
let questionEnded = false;
let time = 0;
let newLeader = ""

let playersCount = 0
let currentQuestionIndex = 0
let round = {
    rounds : (params.quiz_type == 0 || params.quiz_type == 1) ? 1 : 2 ,
    current : 1
}

console.log(document.getElementById("responseTable"))

//buttons (leaderboard , next , end , response)
const controlBtns = document.querySelectorAll('.control-strip button')
//players , round , answered, questions
const headerInfo = document.querySelectorAll('header table tr td:nth-child(even)');
const mainDisplay = document.querySelector(".main-display")

//When host connects to server
socket.on('connect', function () {
    // socket.emit('identifyUser', { role: 'host' });
    document.querySelector("#app").style.display = 'none'

    // console.log("emiitnf host-join-game")
    socket.emit('host-join-game', params.id);
});


//host-join-game returns data{questionData,time,playersCount}
socket.on('gameQuestions', function (data) {
    currentQuestionIndex++

    console.log(`question ${currentQuestionIndex} :` ,data);
    playersCount = data.playersCount
    time = data.time
    
    controlBtns[0].disabled = false
    controlBtns[1].disabled = true
    controlBtns[2].disabled = true
    controlBtns[3].disabled = true

    setHeaderInfo(players = data.playersCount)

    //set display panel on first question of round
    if(currentQuestionIndex == 1){
        console.log("first question , setting main display for")
        if(data.questionData.type === "mcq"){
            console.log("mcq")
            setMainDisplay("mcq")
        }else if(data.questionData.type === "buzzer"){
            console.log("buzzer")
            setMainDisplay("buzzer") 
            
        }
    }else{
        if(data.questionData.type === "buzzer"){
            const buzzerDetails = document.querySelector(".buzzer-details p");
            if (buzzerDetails && !buzzerDetails.classList.contains("hidden")) {
                toggleLottieContent()
            }
        }
    }

    displayQuestion(data.questionData)

    if(data.questionData.type == "mcq"){
        console.log("timer started")
        startTimer(data.time, () => {
            console.log('timeUp event emitted');
            socket.emit('timeUp');  
        }, 2);
        correctAns = data.questionData[`op${data.questionData.correct}`]
    }else{
        setTimeout(function () {
            controlBtns[1].disabled = false;
        }, 5000); 
        correctAns = data.questionData.correct
    }
    currQuesType = data.questionData.type
    console.log("ended game Quesions method")
});

socket.on('updatePlayersAnswered', function (data) {
    console.log("player Answered , count :",data)
    headerInfo[2].textContent = data;
});

//data = {hostId,playerId,name}
socket.on("firstToBuzzer", (data)=>{
    console.log("first to buzzer ",data)
    buzzerPlayer = data

    //flash player's name on screen , wait for some
    //time for answer and enable view response button

    showToast(`wait for ${data.name} to answer the question , then click on responses`)
    controlBtns[3].disabled = false

    //animation
    document.querySelector(".buzzer-details p span").textContent = `${data.name} `
    toggleLottieContent()
    showBothBuzzerResponse()

    //set-up responses-display
    document.querySelector(".responses-section .answer p").textContent = correctAns
    document.querySelector(".buzzer-response-display p span").textContent = data.name;
})

//logic for handling end of question (data = {playerData , correctAnswer} 
//data =  {hostId,playerId,name}) ==> for buzzer questions received twice,player buzzers
//after updting scores ==> 1st one

socket.on('questionOver', (data)=> {
    console.log("question over : " , data)
    
    if(currQuesType === "mcq"){
        //frontend logic to setup response popup
        showToast("Question Over, View answer and responses.")
        controlBtns[3].disabled = false
        document.querySelector(".responses-section .answer p").textContent = correctAns
        stopTimer();
        //clear contents
        const container = document.getElementById("responseTable");
        container.innerHTML = "";
        // Select all child elements except the <p> tag
        // while (container.lastElementChild && container.lastElementChild.tagName !== 'P') {
        //     container.removeChild(container.lastElementChild);
        // }
    
        let options = document.querySelectorAll(".option-panel div")
        let counter = 1;
        data.forEach(player => {
            let response ;
            let isCorrect = null
            if (player.gameData.answer == 0) {
                response = "NO RESPONSE"
            } else {
                response = options[player.gameData.answer - 1].textContent;
                isCorrect = options[player.gameData.answer - 1].textContent == correctAns ? true : false;
            }
            addResponseItem(counter, player.name, response ,isCorrect );
            counter++;
        });       
    }else{
        showToast("Question Over, view leaderboard or move to next question.")
        
    }

    renderLeaderboard(data)
});

socket.on('GameOver', function (data) {
    console.log("game over" ,data);
    showToast("Game Over. displaying final results...")
    setTimeout(function() {
        // window.location.href = `../../result/?id=${params.id}`;
    
        document.querySelector("section").style.display = 'none'
        document.querySelector(".leaderboard-section").style.display = 'none'
        document.querySelector(".responses-section").style.display = 'none'

        document.querySelector("#app").style.display = 'grid'
        document.getElementById("close-game").style.display = 'block'
        if (data[0].name !== newLeader) {
            newLeader = data[0].name;
        }
       
        //render top-3
        let topThree = data.slice(0, 3);
        renderTopThree([topThree[2],topThree[0],topThree[1]]);
        // renderAllPlayers(data);
    }, 2000); 
});

socket.on("error", function (message) {
    console.log("Error: " + message);
    showToast("Some error occured!","error")
});

socket.on('noGameFound', function () {
    showToast("Game not found! redirecting...","error")
    setTimeout(function () {
        window.location.href = '../../'; // Redirect user to 'join game' page after 5s
    }, 4000); 
});

socket.on("noQuestionsAvailable", async () => {
    showToast("No questions available! redirecting...","error")
    setTimeout(function () {
        window.location.href = '../../'; // Redirect user to 'join game' page after 5s
    }, 4000); 
});

//sets the header inforamtion display
function setHeaderInfo(players = -1 , answered = -1){
    if(players != -1){
        headerInfo[0].textContent = players
    }

    if(answered != -1){
        headerInfo[2].textContent = answered
    }

    //set fields on first question of round
    if (currentQuestionIndex == 1) {
        if(params.quiz_type == 0 || params.quiz_type == 1){
            headerInfo[1].textContent = '1 / 1';
            headerInfo[3].textContent = params.quiz_type == 0 ? params.no_mcq : params.no_buzzer
        }else if(params.quiz_type == 2 || params.quiz_type == 3){
            if(round.current == 1){
                headerInfo[1].textContent = '1 / 2';
                headerInfo[3].textContent = params.quiz_type == 2 ? params.no_mcq : params.no_buzzer
            }else if(round.current == 2){
                headerInfo[1].textContent = '2 / 2';
                headerInfo[3].textContent = params.quiz_type == 3 ? params.no_mcq : params.no_buzzer
            }
        }
    }
}

function setMainDisplay(type){
    
    const options = document.querySelector(".option-panel")
    const buzzerDetails = document.querySelector(".buzzer-details")

    const marks = document.querySelectorAll(".marks-container div")
    if(type === "mcq"){
        console.log("inside setMainDisplay => mcq")
        options.classList.remove("hidden")
        buzzerDetails.classList.add("hidden")

        marks[0].textContent = params.mcq_p
        marks[1].textContent = params.mcq_n
    }else{
        console.log("inside setMainDisplay => buzzer")
        options.classList.add("hidden")
        buzzerDetails.classList.remove("hidden")

        marks[0].textContent = params.buzzer_p
        marks[1].textContent = params.buzzer_n
    }
}


function displayQuestion(questionData){
    console.log("inside DisplayQuestion")
    document.querySelector(".que-header div span").textContent = currentQuestionIndex

    const que_text = document.querySelectorAll(".que-body .text p")
    const options = document.querySelectorAll(".option-panel div")

    que_text[0].textContent = questionData.que_hi
    que_text[1].textContent = questionData.que_en
    if(questionData.type === "mcq"){
        console.log("inside DisplayQuestion => mcq / options")
        options[0].textContent = questionData.op1
        options[1].textContent = questionData.op2
        options[2].textContent = questionData.op3
        options[3].textContent = questionData.op4
    }

    if(questionData.media){
        if(questionData.media.image){
            console.log("inside DisplayQuestion => image")
            const image = document.querySelector(".que-body img")
            image.src = `../../uploads/${params.db_id}_${questionData.media.image}`
            setupQuestioSubtype('image')
        }else if(questionData.media.audio){
            console.log("inside DisplayQuestion => audio")
            const audioFileName = `${params.db_id}_${questionData.media.audio}`;
    
            const mp3Source = document.querySelector(".que-body audio source[type='audio/mpeg']");
            const oggSource = document.querySelector(".que-body audio source[type='audio/ogg']");
            
            //audio format
            if (questionData.media.audio.endsWith('.mp3')) {
                mp3Source.src = `../../uploads/${audioFileName}`;
                oggSource.src = ''; 
            } else if (questionData.media.audio.endsWith('.ogg')) {
                oggSource.src = `../../uploads/${audioFileName}`;
                mp3Source.src = ''; 
            } else {
                console.error("Unsupported audio format");
                showToast("Unsupported audio format","error");
            }

            
            const audioElement = document.querySelector(".que-body audio");
            // Load the new source
            audioElement.load();
            
            setupQuestioSubtype('audio')
        }
    }else{
        console.log("inside DisplayQuestion => text")
        setupQuestioSubtype('text')
    }
}

//used by 'displayQuestion()'
function setupQuestioSubtype(type = 'text'){
    const text = document.querySelector(".text");
    const audio = document.querySelector('audio');
    const image = document.querySelector(".image-wrapper");
    if(type === "text"){
        console.log("inside QuestionSubtype => text")
        audio.classList.add('hidden');
        image.classList.add('hidden');
        text.style.flexBasis = '100%';
        text.style.width = '100%';
    }else if(type === "audio"){
        console.log("inside QuestionSubtype => audio")
        audio.classList.remove('hidden')
        image.classList.add('hidden')
        text.style.flexBasis = '100%';
        text.style.width = '100%';
    }else if(type === "image"){
        console.log("inside QuestionSubtype => image")
        image.classList.remove('hidden')
        text.style.flexBasis = '50%';
        text.style.width = '50%';
        audio.classList.add('hidden')
    }
}
function addResponseItem(id, name, response, isCorrect) {
    // Find the table
    const mTable = document.getElementById("responseTable");

    // Create a new row
    const newRow = mTable.insertRow();

    // Create cells for the row
    const idCell = newRow.insertCell(0);
    const nameCell = newRow.insertCell(1);
    const responseCell = newRow.insertCell(2);
    const correctCell = newRow.insertCell(3);

    // Fill cells with the provided data
    idCell.textContent = id;
    nameCell.textContent = name;
    responseCell.textContent = response;

    if(isCorrect == null){
        correctCell.innerHTML = '<i class="fa-solid fa-comment-slash"></i>';
    }else{
        correctCell.innerHTML = isCorrect ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-xmark"></i>';
    }
}
// function addResponseItem(id, name, response, isCorrect) {
//     const container = document.querySelector(".mcq-response-display table")
//     if (!container) {
//         console.error('Table container not found');
//         return; // Stop execution if container is null
//     }
//     const item = document.createElement('tr');
//     // item.classList.add('item');

//     const idSpan = document.createElement('td');
//     idSpan.textContent = id;
//     item.appendChild(idSpan);

//     const nameSpan = document.createElement('td');
//     nameSpan.textContent = name;
//     item.appendChild(nameSpan);

//     const responseSpan = document.createElement('td');
//     responseSpan.textContent = response;
//     item.appendChild(responseSpan);

//     const statusSpan = document.createElement('td');
//     const icon = document.createElement('i');

//     if(isCorrect == null){
//         icon.classList.add('fa-solid','fa-comment-slash');
//     }else{
//         icon.classList.add('fa-solid', isCorrect ? 'fa-circle-check' : 'fa-circle-xmark');
//     }
//     statusSpan.appendChild(icon);
//     item.appendChild(statusSpan);

//     container.appendChild(item);
// }

// Function to add a leaderboard item
function addLeaderboardItem(container, rank, name, points) {
    const item = document.createElement('div');
    item.classList.add('item');

    const rankSpan = document.createElement('span');
    rankSpan.textContent = `${rank < 10 ? '0' + rank : rank}.`;
    item.appendChild(rankSpan);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    item.appendChild(nameSpan);

    const pointsSpan = document.createElement('span');
    pointsSpan.textContent = `${points} Pts`;
    item.appendChild(pointsSpan);

    container.appendChild(item);
}

function renderLeaderboard(data) {
    const overallContainer = document.querySelector('.leaderboard-items.overall-tab');
    const buzzerContainer = document.querySelector('.leaderboard-items.buzzer-tab');
    const mcqContainer = document.querySelector('.leaderboard-items.mcq-tab');

    // Clear existing items
    overallContainer.innerHTML = '';
    buzzerContainer.innerHTML = '';
    mcqContainer.innerHTML = '';

    // Sort data based on scores
    const sortedOverall = [...data].sort((a, b) => (b.gameData.score_mcq + b.gameData.score_buzzer) - (a.gameData.score_mcq + a.gameData.score_buzzer));
    const sortedBuzzer = [...data].sort((a, b) => b.gameData.score_buzzer - a.gameData.score_buzzer);
    const sortedMcq = [...data].sort((a, b) => b.gameData.score_mcq - a.gameData.score_mcq);

    // Add sorted data to the leaderboard
    sortedOverall.forEach((player, index) => {
        addLeaderboardItem(overallContainer, index + 1, player.name, player.gameData.score_mcq + player.gameData.score_buzzer);
    });

    sortedBuzzer.forEach((player, index) => {
        addLeaderboardItem(buzzerContainer, index + 1, player.name, player.gameData.score_buzzer);
    });

    sortedMcq.forEach((player, index) => {
        addLeaderboardItem(mcqContainer, index + 1, player.name, player.gameData.score_mcq);
    });

    // Logic to handle params.quiz_type
    if (params.quiz_type === 0) {
        // Show overall and mcq, hide buzzer, display "not in a round" for buzzer
        document.querySelector('.overall').classList.add('active');
        document.querySelector('.mcq-round').classList.add('active');
        document.querySelector('.buzzer-round').classList.remove('active');
        buzzerContainer.innerHTML = `<div class="item"><span>Not in a round</span></div>`;
    } else if (params.quiz_type === 1) {
        // Show overall and buzzer, hide mcq, display "not in a round" for mcq
        document.querySelector('.overall').classList.add('active');
        document.querySelector('.buzzer-round').classList.add('active');
        document.querySelector('.mcq-round').classList.remove('active');
        mcqContainer.innerHTML = `<div class="item"><span>Not in a round</span></div>`;
    } else if (params.quiz_type === 2 || params.quiz_type === 3) {
        // Show all three categories
        document.querySelector('.overall').classList.add('active');
        document.querySelector('.buzzer-round').classList.add('active');
        document.querySelector('.mcq-round').classList.add('active');
    }
}
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    

//leaderboard
const hideBtn = document.querySelector('.hide-leaderboard');
const leaderboardSection = document.querySelector('.leaderboard-section');
const tabButtons = document.querySelectorAll('.tab-menu div');
const tabs = document.querySelectorAll('.leaderboard-items');

//hide
hideBtn.addEventListener('click', () => {
    leaderboardSection.style.right = '-60rem';
    mainDisplay.style.opacity = 1;
});

// Function to switch between tabs
tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabs.forEach(tab => tab.classList.remove('active'));

        // Add active class to clicked button and corresponding tab
        button.classList.add('active');
        tabs[index].classList.add('active');
    });
});

//response section
const hideResponsesBtn = document.querySelector('.hide-responses');
const responsesSection = document.querySelector('.responses-section');
const mcqDisplay = document.querySelector('.mcq-response-display');
const buzzerDisplay = document.querySelector('.buzzer-response-display');

// Hide
hideResponsesBtn.addEventListener('click', () => {
    responsesSection.style.right = '-100rem'; 
    mainDisplay.style.opacity = 1;
});

// Toggle between MCQ and Buzzer response displays
function toggleResponseDisplay(type = 'mcq') {
    console.log("called response display",type)
    if (type === 'mcq') {
        mcqDisplay.classList.add('active');
        buzzerDisplay.classList.remove('active');
    } else if (type === 'buzzer') {
        buzzerDisplay.classList.add('active');
        mcqDisplay.classList.remove('active');
    }
}

function toggleLottieContent() {
    const loader = document.querySelector('.buzzer-details .loader');
    const lottiePlayer = document.querySelector('.buzzer-details dotlottie-player');
    const p = document.querySelector(".buzzer-details p")

    lottiePlayer.classList.toggle('hidden');
    p.classList.toggle('hidden')
    loader.classList.toggle('hidden'); 
}

const correctBuzzer = document.getElementById('correct-buzzer');
const incorrectBuzzer = document.getElementById('incorrect-buzzer');
function toggleBuzzer(response) {
    if (response === 'correct') {
        incorrectBuzzer.style.display = 'none'; // Hide incorrect buzzer
        correctBuzzer.play();                   // Play correct animation
    } else if (response === 'incorrect') {
        correctBuzzer.style.display = 'none';    // Hide correct buzzer
        incorrectBuzzer.play();                  // Play incorrect animation
    }
}
function showBothBuzzerResponse(){
    correctBuzzer.style.display = 'block'
    incorrectBuzzer.style.display = 'block'
}

//control buttons 
//view-leader
controlBtns[0].addEventListener('click', ()=>{
    leaderboardSection.style.right = '10rem';
    mainDisplay.style.opacity = 0;
})
//next-question
controlBtns[1].addEventListener('click', ()=>{
    headerInfo[2].textContent = "00"
    console.log("clicked next question")
    socket.emit('nextQuestion'); //Tell server to start new question
})
//end-button
controlBtns[2].addEventListener('click', ()=>{
    headerInfo[2].textContent = "00"
    if(controlBtns[2].ariaLabel == 'End Quiz'){
        console.log("end quiz clicked")
        showToast("Ending quiz , displaying results...")
        // setTimeout(function () {
        //     window.location.href = `../../result/?id=${params.id}`; 
        // }, 4000);
        socket.emit('nextQuestion');
    }else{
        console.log("clicked next round")
        socket.emit('nextQuestion'); //Tell server to start new question
    }
})
//view-response
controlBtns[3].addEventListener('click', ()=>{
    console.log("Response button clicked ",round , currentQuestionIndex)
    
    if(currQuesType == 'mcq'){
        toggleResponseDisplay('mcq');
    }else{
        toggleResponseDisplay('buzzer');
    }
    mainDisplay.style.opacity = 0;
    responsesSection.style.right = '10rem';


    //display required flow contorl button
    if (
        (params.quiz_type == 0 && currentQuestionIndex == params.no_mcq) ||
        (params.quiz_type == 1 && currentQuestionIndex == params.no_buzzer) || 
        (params.quiz_type == 2 && round.current == 2 && currentQuestionIndex == params.no_buzzer) ||
        (params.quiz_type == 3 && round.current == 2 && currentQuestionIndex == params.no_mcq)
      ) {
          //show end quiz button
        //   controlBtns[2].style.display = 'block'
        console.log("response button logic if")
          controlBtns[2].ariaLabel = 'End Quiz'
          controlBtns[1].disabled = true; //disable next ques button
          controlBtns[2].disabled = false;
      }else if(
        (params.quiz_type == 2 && round.current == 1 && currentQuestionIndex == params.no_mcq) ||
        (params.quiz_type == 3 && round.current == 1 && currentQuestionIndex == params.no_buzzer)
      ){
          //show next round button
        //   controlBtns[2].style.display = 'block'
        console.log("response button logic else-if")
          controlBtns[2].ariaLabel = 'Next Round'
          controlBtns[1].disabled = true; //disable next ques button
          controlBtns[2].disabled = false;
          
          //reset counter
          console.log("reset currentQuestionIndex controlBtn[3].addEventLister")
          round.current = 2
          currentQuestionIndex = 0 
      }else{
        console.log("response button logic else")
        controlBtns[1].disabled = false;
      }
})

//buzzer response buttons
document.getElementById('correct-buzzer').addEventListener('click',()=>{
    socket.emit("updateBuzzerScores",{
        "player" : buzzerPlayer,
        "res" : true})

    //display animation
    toggleBuzzer('correct')
    console.log("player's answer was correct")
})
document.getElementById('incorrect-buzzer').addEventListener('click',()=>{
    socket.emit("updateBuzzerScores",{
        "player" : buzzerPlayer,
        "res" : false})

    //display animation
    toggleBuzzer('incorrect')
    console.log("player's answer was not correct")
})

document.getElementById("close-game").addEventListener('click',()=>{
    showToast("Ending game! Redirecting in 2 seconds...");
    console.log("no question in the game");
    setTimeout(function(){
        window.location.href = '../../'; 
    },2000); 
})