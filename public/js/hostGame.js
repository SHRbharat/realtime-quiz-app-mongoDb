var socket = io();
//Gets {id,quiz_type,mcq_p,mcq_n,buzzer_p,buzzer_n,no_mcq,no_buzzer} from url
var params = jQuery.deparam(window.location.search); 

//player to buzzer first
let buzzerPlayer = null;
let correctAns = null;
let currQuesType = null;
let questionEnded = false;
let time = 0;

let playersCount = 0
let currentQuestionIndex = 0
let round = {
    rounds : (params.quiz_type == 0 || params.quiz_type == 1) ? 1 : 2 ,
    current : 1
}


//buttons (leaderboard , next , end , response)
const controlBtns = document.querySelectorAll('.control-strip button')
const headerInfo = document.querySelectorAll('.header-info span');
const mainDisplay = document.querySelector(".main-display")

//When host connects to server
socket.on('connect', function () {
    // socket.emit('identifyUser', { role: 'host' });
    // if(params.quiz_type == 0 || params.quiz_type == 1){
    //     round.rounds = 1
    // }else if(params.quiz_type == 2 || params.quiz_type == 3){
    //     round.rounds = 2
    // }

    // console.log("emiitnf host-join-game")
    socket.emit('host-join-game', params.id);
});



//host-join-game returns data{questionData,time,playersCount}
socket.on('gameQuestions', function (data) {
    currentQuestionIndex++

    console.log(`question ${currentQuestionIndex} :` ,data);
    playersCount = data.playersCount
    time = data.time
    
    controlBtns[1].disabled = true
    controlBtns[2].disabled = true
    controlBtns[2].style.display = 'none'
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
    }

    displayQuestion(data.questionData)

    if(data.questionData.type == "mcq"){
        console.log("timer started")
        startTimer(data.time, () => {
            console.log('timeUp event emitted');
            socket.emit('timeUp');  
        }, 2);
        correctAns = data.questionData[`op${data.questionData.correct}`]
        currQuesType = "mcq"
    }else{
        correctAns = data.questionData.correct
        currQuesType = "buzzer"
    }
    console.log("ended game Quesions method")
});


//data {hostId,playerId,name}
// socket.on("updateBuzzerList",(data)=>{
//     console.log("buzzer by" , data);
//     buzzerPlayer = data

//     //display animation for player buzzer (d)

//     //display response buttons for host , after answer
//     document.getElementById('response-popup').style.display = 'block';
//     controlBtns[0].style.display = 'block'

//     document.getElementById('correctBuzzer').addEventListener('click',()=>{
//         socket.emit("updateBuzzerScores",{
//             "player" : buzzerPlayer,
//             "res" : true})
//     })
//     document.getElementById('incorrectBuzzer').addEventListener('click',()=>{
//         socket.emit("updateBuzzerScores",{
//             "player" : buzzerPlayer,
//             "res" : false})
//     })
// })

socket.on('updatePlayersAnswered', function (data) {
    document.querySelector('.header-info span:nth-child(2)').innerHTML = data;
});

//logic for handling end of question (data = {playerData , correctAnswer} / {hostId,playerId,name})
socket.on('questionOver', (data)=> {
    console.log("question over : " , data)
    stopTimer();
   

    //frontend logic to setup response popup
    showToast("Question Over, View answer and responses.")
    controlBtns[3].disabled = false
    document.querySelector(".responses-section .answer p").textContent = correctAns
    
    if(currQuesType === "mcq"){
        //clear contents
        const container = document.querySelector('.mcq-response-display');
        // Select all child elements except the <p> tag
        while (container.lastElementChild && container.lastElementChild.tagName !== 'P') {
            container.removeChild(container.lastElementChild);
        }
    
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
        //if buzzered 
        console.log("buzzer by" , data);
        buzzerPlayer = data

        //display animation for player buzzer (d)

        //render
        document.querySelector("buzzer-response-display p span").textContent = data
        
        document.getElementById('correct-buzzer').addEventListener('click',()=>{
            socket.emit("updateBuzzerScores",{
                "player" : data,
                "res" : true})

            //display animation
        })
        document.getElementById('incorrect-buzzer').addEventListener('click',()=>{
            socket.emit("updateBuzzerScores",{
                "player" : data,
                "res" : false})

            //display animation
        })
    }

    //update leaderboard
    renderLeaderboard(data)
});


socket.on('GameOver', function (data) {
    console.log("leaderboard" ,data);
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
        headerInfo[1].textContent = answered
    }

    //set fields on first question of round
    if (currentQuestionIndex == 1) {
        if(params.quiz_type == 0 || params.quiz_type == 1){
            headerInfo[2].textContent = '1 / 1';
            headerInfo[3].textContent = params.quiz_type == 0 ? params.no_mcq : params.no_buzzer
        }else if(params.quiz_type == 2 || params.quiz_type == 3){
            if(round.current == 1){
                headerInfo[2].textContent = '1 / 2';
                headerInfo[3].textContent = params.quiz_type == 2 ? params.no_mcq : params.no_buzzer
            }else if(round.current == 2){
                headerInfo[2].textContent = '2 / 2';
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
    document.querySelector(".que-header div").textContent = currentQuestionIndex

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
            const audio = document.querySelector(".que-body audio source")
            audio.src = `../../uploads/${params.db_id}_${questionData.media.audio}`
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
    const container = document.querySelector('.mcq-response-display');
    const item = document.createElement('div');
    item.classList.add('item');

    const idSpan = document.createElement('span');
    idSpan.textContent = id;
    item.appendChild(idSpan);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    item.appendChild(nameSpan);

    const responseSpan = document.createElement('span');
    responseSpan.textContent = response;
    item.appendChild(responseSpan);

    const statusSpan = document.createElement('span');
    const icon = document.createElement('i');

    if(isCorrect == null){
        icon.classList.add('fa-solid','fa-comment-slash');
    }else{
        icon.classList.add('fa-solid', isCorrect ? 'fa-circle-check' : 'fa-circle-xmark');
    }
    statusSpan.appendChild(icon);
    item.appendChild(statusSpan);

    container.appendChild(item);
}

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
    responsesSection.style.right = '-60rem'; 
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



//control buttons 
//view-leader
controlBtns[0].addEventListener('click', ()=>{
    leaderboardSection.style.right = '10rem';
    mainDisplay.style.opacity = 0;
})
//next-question
controlBtns[1].addEventListener('click', ()=>{
    console.log("clicked next question")
    socket.emit('nextQuestion'); //Tell server to start new question
})
//end-button
controlBtns[2].addEventListener('click', ()=>{
    if(controlBtns[2].ariaLabel == 'End Quiz'){
        console.log("end quiz clicked")
        showToast("Ending quiz , displaying results...")
        setTimeout(function () {
            window.location.href = `../../result/?id=${params.id}`; 
        }, 4000);
    }else{
        console.log("clicked next round")
        socket.emit('nextQuestion'); //Tell server to start new question
    }
})
//view-response
controlBtns[3].addEventListener('click', ()=>{
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
          controlBtns[2].style.display = 'block'
          controlBtns[2].ariaLabel = 'End Quiz'
          controlBtns[1].style.display = 'none'
          controlBtns[2].disabled = false;
      }else if(
        (params.quiz_type == 2 && round.current == 1 && currentQuestionIndex == params.no_mcq) ||
        (params.quiz_type == 3 && round.current == 1 && currentQuestionIndex == params.no_buzzer)
      ){
          //show next round button
          controlBtns[2].style.display = 'block'
          controlBtns[2].ariaLabel = 'Next Round'
          controlBtns[1].style.display = 'none'
          controlBtns[2].disabled = false;
          
          //reset counter
          console.log("reset currentQuestionIndex controlBtn[3].addEventLister")
          round.current = 2
          currentQuestionIndex = 0 
      }

    controlBtns[1].disabled = false;
})