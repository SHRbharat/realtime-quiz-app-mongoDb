var socket = io();
//marks are positieve integers
// id,quiz_type,mcq_p,mcq_n,buzzer_p,buzzer_n,no_mcq,no_buzzer,db_id
var params = jQuery.deparam(window.location.search); 
console.log("params : ",params)


let correct = "NO RESPONSE"; //true , false , "NA" (after time) , "NO RESPONSE" 
let buzzerAck = "NO RESPONSE"; //"BUZZER" , "NOT BUZZER" , "NO RESPONSE" 

let playerAnswered = false;
let score = {mcq: 0,buzzer:0};
let playerData = null;
let time;
let currQuesType;
let round = {
    rounds : (params.quiz_type == 0 || params.quiz_type == 1) ? 1 : 2 ,
    current : 1
}
let newLeader =""

let currentQuestionIndex = 0


const headerInfo = document.querySelectorAll('header table tr td:nth-child(even)');
const mainDisplay = document.querySelector(".main-display");
const responseBtns = document.querySelectorAll(".option-panel div")
const buzzerBtn = document.querySelector(".buzzer-btn")

socket.on('connect', function() {
    // socket.emit('identifyUser', { role: 'player' });
    document.querySelector("#app").style.display = 'none'
    //Tell server that it is player connection from game view , asks for palyer data
    socket.emit('player-join-game', params.id);
    
    //display loader , waiting for next question
    startLoader()
});

//receives player and game data , update the ui (only once => player-join-game)
//data = {playerData{hostId,playerId,name} , time , questionData{type,que_hi,que_en,op1-op4}}
socket.on('playerGameData', function(data){
    stopLoader()
    console.log("playerGameData :" , data);

    currentQuestionIndex++
    time = data.time
    playerData = data.playerData

    setHeaderInfo(players = data.playersCount)

    //set display panel on first question of round
    console.log("first question , setting main display for")
    if(data.questionData.type === "mcq"){
        console.log("mcq")
        setMainDisplay("mcq")
    }else if(data.questionData.type === "buzzer"){
        console.log("buzzer")
        setMainDisplay("buzzer") 
    }

    displayQuestion(data.questionData)

    if(data.questionData.type == "mcq"){
        console.log("timer started")
        startTimer(data.time, () => {
            console.log('times up');
            //disable responses after time runs out
            // responseBtns.forEach(element => {
            //     element.classList.add('disabled')
            // });
        }, 2);
    }else{
        document.querySelector(".time-remaining").textContent = "- -"
    }

    currQuesType = data.questionData.type
 });

//receive questions after the first one, data = {questionData}
socket.on('nextQuestionPlayer', function(data){
    //new round has started
    stopLoader()
    if( (round.rounds == 2 && currentQuestionIndex == params.no_mcq) || 
        (round.rounds == 3 && currentQuestionIndex == params.no_buzzer)){
        currentQuestionIndex = 0
        round.current = 2
    }

    correct = "NO RESPONSE";
    buzzerAck = "NO RESPONSE";
    playerAnswered = false;
    currentQuestionIndex++;

    console.log("question /nwxt" , data)
    setHeaderInfo(players = data.playersCount)

    //set display panel on first question of round
    console.log("first question , setting main display for" , 
        data.questionData.type,
        currentQuestionIndex 
    )

    if(currentQuestionIndex == 1){
        data.questionData.type === "mcq" ? setMainDisplay("mcq") : setMainDisplay("buzzer")
    }

    displayQuestion(data.questionData)

    if(data.questionData.type == "mcq"){
        console.log("timer started",time)
        startTimer(time, () => {
            console.log('times up');
            //disable responses   
            // responseBtns.forEach(element => {
            //     element.style.opacity = '0.2'
            //     element.classList.add('disabled')
            // });
        }, 2);
    }else{
        document.querySelector(".time-remaining").textContent = "- -"
    }

    currQuesType = data.questionData.type
});

// submit mcq (1-4) 
function submitMcq(num){
    if(playerAnswered == false){
        playerAnswered = true;
        console.log(`answer submitted : ${responseBtns[num-1].textContent}` , num , time)
        stopTimer();

        socket.emit('playerAnswer', num);
        showToast(`answer submitted : ${responseBtns[num-1].textContent}`)
        
        //trigger a lay-over , with waiting for result loader 

    }
}

//after evaluation
socket.on('answerResult', function(data){
    if(data == "true"){
        correct = true;
    }else if(data == "false"){
        correct = false
    }else if(data == "NA"){
        correct = "NA"
    }else{
        correct = "NO RESPONSE"
    }
});

function submitBuzzer(){
    if(!playerAnswered){
        playerAnswered = true
        console.log("player buzzered")
        socket.emit("playerBuzzered")
        showToast("Buzzered Successfully")
    }

    //trigger a lay-over , with waiting for result loader  
}

socket.on("buzzerAck", (ack)=>{
    if(ack == true){
        buzzerAck = "BUZZER"
        console.log("you buzzered first!!! Say your asnwer loud")
        showToast("you buzzered first!!! Say your asnwer loud")
        //dispaly result of buzzer on popover
    }else{
        buzzerAck = "NOT BUZZER"
        console.log("your buzzer was not recorded")
        showToast("your buzzer was not recorded","error")
    }
})

//when question ends 
socket.on('questionOver', function(data){
    //hide the question and display answer pop-up and waiting for next question
    console.log("<< question over>>",data,correct)

    // socket.emit('getScore');

    if(currQuesType == 'mcq'){
        if(!playerAnswered) 
            stopTimer();

        if(correct == true){
            console.log("correct answer")
            //display result with animatio on pop-over , with waiting for next question
            displayResultWithTimeout(true)
            showToast("Your answer was correct!")
        }else if(correct == false){
            console.log("incorrect answer")
            displayResultWithTimeout(false)
            showToast("Your answer was incorrect","error")
        }else if(correct == "NA"){
            console.log("time limit")
            showToast("You responsed after time was over","error")
        }else{
            console.log("No response")
            showToast("No response from your side.")
        }
    }

    score.mcq = data.gameData.score_mcq
    score.buzzer = data.gameData.score_buzzer
    console.log("Updated Marks : ",score.mcq , score.buzzer)
    headerInfo[2].textContent = score.mcq + score.buzzer

    // }else if(currQuesType == "buzzer" && !data.gameData){
    //     if(correct == "BUZZER"){
    //         console.log("YoUR BUZZER , SAY YOUR ANSWER LOUD")
    //     }else{
    //         console.log("NO RESPONSE - buzzer")
    //     }
    // }
    setTimeout(function() {
        startLoader();
    }, 5000);
});

//after updating scores from the host
//data = name , hostid , gameData etc
socket.on("buzzerQuestionOver",(data)=>{
    // socket.emit('getScore')
    console.log("<<buzzer question over>>", data)
    console.log("<<scores before buzzer >>" , score.mcq , score.buzzer)
    console.log("<<scores received >>",data.gameData.score_buzzer)
    if(currQuesType == "buzzer"){
        //buzzer result
        if(score.buzzer == data.gameData.score_buzzer || buzzerAck == "NOT BUZZER"){
            console.log("NO resposne for buzzzer - no deductions")
            showToast("No buzzer from your side")
        }
        else if(buzzerAck == "BUZZER" && score.buzzer > data.gameData.score_buzzer){
            console.log("wrong answer - buzzer")
            displayResultWithTimeout(false)
            showToast("Wrong answer after buzzer!","error")
        }else if(buzzerAck == "BUZZER" && score.buzzer < data.gameData.score_buzzer){
            console.log("correct answer buzzer")
            displayResultWithTimeout(true)
            showToast("Correct answer after buzzer!")
        }
    }
    score.mcq = data.gameData.score_mcq
    score.buzzer = data.gameData.score_buzzer

    console.log("Updated Marks : ",score.mcq , score.buzzer)
    headerInfo[2].textContent = score.mcq + score.buzzer
    // socket.emit('getScore');
    setTimeout(function() {
        startLoader();
    }, 5000);
})

// socket.on('newScore', function(data){
//     console.log("score <need to be fired just afeter questionOver>: ", data)

//     document.querySelector(".header-info .left p:last-child span").textContent = data.mcq + data.buzzer
//     score.mcq = data.mcq
//     score.buzzer = data.buzzer
// });


socket.on('GameOver', function (data) {
    console.log("game over" ,data);
    showToast("Game Over. displaying final results...")
    setTimeout(function() {
        // window.location.href = `../../result/?id=${params.id}`;
    
        document.querySelector("section").style.display = 'none'
        
        document.querySelector("#app").style.display = 'grid'
        document.querySelector("#close-game").style.display = 'block'
        if (data[0].name !== newLeader) {
            newLeader = data[0].name;
        }
       
        //render top-3
        let topThree = data.slice(0, 3);
        renderTopThree([topThree[2],topThree[0],topThree[1]]);
        // renderAllPlayers(data);
    }, 2000); 
});

socket.on('hostDisconnect', function(){
    console.log("host disconnected , redircting")
    setTimeout(function() {
        window.location.href = "../../";
    }, 5000); 
});

socket.on('noGameFound', function(){
    showToast("Game not found! Redirecting in 5 seconds...", "error");
    console.log("game not found");
    setTimeout(function(){
        window.location.href = '../../'; // Redirect user to 'join game' page
    }, 5000); 
});

socket.on('noQuestionsAvailable', function(){
    showToast("No questions available! Redirecting in 5 seconds...", "error");
    console.log("no question in the game");
    setTimeout(function(){
        window.location.href = '../../'; // Redirect user to 'join game' page
    }, 5000); 
});


socket.on("error", function (message) {
    showToast("message" , "error")
    console.log("Error: " + message);
});

//sets the header inforamtion display
function setHeaderInfo(){
    if(currentQuestionIndex == 1){
        headerInfo[0].textContent = playerData.name
        if(params.quiz_type == 0 || params.quiz_type == 1){
            headerInfo[1].textContent = '1 / 1'
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

    if(params.quiz_type == 0)
        headerInfo[2].textContent = score.mcq
    else if(params.quiz_type == 1)
        headerInfo[2].textContent = score.buzzer
    else{
        headerInfo[2].textContent = score.buzzer + score.mcq
    }
}

function setMainDisplay(type){
    const marks = document.querySelectorAll(".marks-container div")
    const optionPanel = document.querySelector(".option-panel")
    if(type === "mcq"){
        console.log("inside setMainDisplay => mcq")
        // for(let i=0;i<4;i++){
        //     responseBtns[i].classList.remove('hidden','disabled')
        // }
        optionPanel.classList.remove('hidden','disabled')
        buzzerBtn.classList.add('hidden')
        
        marks[0].textContent = params.mcq_p
        marks[1].textContent = params.mcq_n
    }else{
        console.log("inside setMainDisplay => buzzer")
        buzzerBtn.classList.remove('hidden','disabled')
        optionPanel.classList.add('hidden')

        marks[0].textContent = params.buzzer_p
        marks[1].textContent = params.buzzer_n
    }
}


function displayQuestion(questionData){
    console.log("inside DisplayQuestion")
    document.querySelector(".que-header div span").textContent = currentQuestionIndex

    const que_text = document.querySelectorAll(".que-body .text p")
   
    que_text[0].textContent = questionData.que_hi
    que_text[1].textContent = questionData.que_en
    if(questionData.type === "mcq"){
        console.log("inside DisplayQuestion => mcq / options")
        responseBtns[0].textContent = questionData.op1
        responseBtns[1].textContent = questionData.op2
        responseBtns[2].textContent = questionData.op3
        responseBtns[3].textContent = questionData.op4
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
function setupQuestioSubtype(type){
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

const correctBuzzer = document.getElementById('correct-buzzer');
const incorrectBuzzer = document.getElementById('incorrect-buzzer');
const animeCont = document.querySelector(".result-container")
const text = document.querySelectorAll(".result-container p")
function showResult(isCorrect) {
    animeCont.style.visibility = 'visible';
    if (isCorrect) {
        correctBuzzer.style.display = 'block';  
        text[0].style.display = 'block';  
        incorrectBuzzer.style.display = 'none';   
        text[1].style.display = 'none';
    } else {
        correctBuzzer.style.display = 'none';  
        text[0].style.display = 'none';   
        incorrectBuzzer.style.display = 'block'; 
        text[1].style.display = 'block'; 
    }
}

function displayResultWithTimeout(isCorrect) {
    showResult(isCorrect);
    
    // Set a timeout to undo the effects after 5 seconds
    setTimeout(() => {
        // Hide the anime container
        animeCont.style.visibility = 'hidden';
        
        // Hide both Lottie players and texts
        correctBuzzer.style.display = 'none';  
        incorrectBuzzer.style.display = 'none';  
        text[0].style.display = 'none';   
        text[1].style.display = 'none';
    }, 5000); 
}
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
for(let i = 0 ; i<4;i++){
    responseBtns[i].addEventListener('click',()=>{
        submitMcq(i + 1)
    })
}

buzzerBtn.addEventListener('click',()=>{
    submitBuzzer();
})

document.getElementById("close-game").addEventListener('click',()=>{
    showToast("Ending game! Redirecting in 2 seconds...");
    console.log("no question in the game");
    setTimeout(function(){
        window.location.href = '../../'; 
    },2000); 
})

const loaderWrapper = document.querySelector('.loader-wrapper');
const leftPanel = document.querySelector('.left-panel');
const rightPanel = document.querySelector('.right-panel');

// Function to start the loader
function startLoader() {
    leftPanel.style.display = 'none';
    rightPanel.style.display = 'none';
    loaderWrapper.style.display = 'block';
}

// Function to stop the loader
function stopLoader() {
    leftPanel.style.display = 'block';
    rightPanel.style.display = 'flex';
    loaderWrapper.style.display = 'none';
}
