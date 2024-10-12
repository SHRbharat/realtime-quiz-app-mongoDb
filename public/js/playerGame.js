var socket = io();

// id,quiz_type,mcq_p,mcq_n,buzzer_p,buzzer_n,no_mcq,no_buzzer,db_id
var params = jQuery.deparam(window.location.search); 
console.log("params : ",params)


//true , false , "NA" (after time) , "NO RESPONSE" 
let correct = "NO RESPONSE";
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

let currentQuestionIndex = 0


const headerInfo = document.querySelectorAll('.header-info span');
const mainDisplay = document.querySelector(".main-display");
const responseBtns = document.querySelectorAll(".option-panel div")

socket.on('connect', function() {
    socket.emit('identifyUser', { role: 'player' });
    //Tell server that it is player connection from game view , asks for palyer data
    socket.emit('player-join-game', params.id);
    
    //display loader , waiting for next question

});

//receives player and game data , update the ui (only once => player-join-game)
//data = {playerData{hostId,playerId,name} , time , questionData{type,que_hi,que_en,op1-op4}}
socket.on('playerGameData', function(data){
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
            responseBtns.forEach(element => {
                element.classList.add('disabled')
            });
        }, 2);
    }else{
        document.querySelector(".time-remaining").textContent = "- -"
    }

    currQuesType = data.questionData.type
 });

//receive questions after the first one, data = {questionData}
socket.on('nextQuestionPlayer', function(data){
    //new round has started
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
    // if(data.questionData.type === "mcq" && currentQuestionIndex == 1){
    //     console.log("mcq")
    //     setMainDisplay("mcq")
    // }else if(data.questionData.type === "buzzer" && currentQuestionIndex == 1){
    //     console.log("buzzer")
    //     setMainDisplay("buzzer") 
    // }

    displayQuestion(data.questionData)

    if(data.questionData.type == "mcq"){
        console.log("timer started",data.time)
        startTimer(time, () => {
            console.log('times up');
            //disable responses   
            responseBtns.forEach(element => {
                element.style.opacity = '0.2'
                element.classList.add('disabled')
            });
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
        console.log("you buzzered first!!!")
        //dispaly result of buzzer on popover
    }else if(ack == false){
        buzzerAck = "NOT BUZZER"
        console.log("your buzzer was not recorded")
    }
})

//when question ends 
//data = {hostId,playerId,name} -> when a buzzer is recorded
//playerData{name,gameData{}} -> when host submits buzzer results
socket.on('questionOver', function(data){
    //hide the question and display answer pop-up and waiting for next question
    console.log("<< question over>>",data,correct)

    let prevBuzzerScore = score.buzzer
    socket.emit('getScore');

    if(currQuesType == 'mcq'){
        if(!playerAnswered) 
            stopTimer();

        if(correct == true){
            console.log("correct answer")
            //display result with animatio on pop-over , with waiting for next question
        }else if(correct == false){
            console.log("incorrect answer")
            
            
        }else if(correct == "NA"){
            console.log("time limit")
            
        }else{
            console.log("No response")
        }
    }else if(currQuesType == "buzzer" && !data.gameData){
        if(correct == "BUZZER"){
            console.log("YoUR BUZZER , SAY YOUR ANSWER LOUD")
        }else{
            console.log("NO RESPONSE - buzzer")
        }
    }else if(currQuesType == "buzzer" && data.gameData){
        //buzzer result
        if(prevBuzzerScore - score.buzzer == 0){
            console.log("NO resposne for buzzzer - no dedctions")
        }
        else if(score.buzzer - prevBuzzerScore < 0){
            console.log("wrong answer - buzzer")
        }else{
            console.log("correct answer buzzer")
        }
    }
});

socket.on('newScore', function(data){
    console.log("score <need to be fired just afeter questionOver>: ", data)

    document.querySelector(".header-info .left p:last-child span").textContent = data.mcq + data.buzzer
    score.mcq = data.mcq
    score.buzzer = data.buzzer
});


socket.on('GameOver', function(data){
    //process and display leaderboard
    console.log("GameOver",data)
    showToast("Game Over. Redirecting to results...")
    setTimeout(function() {
        window.location.href = `../../result/?id=${params.id}`;
    }, 4000); 
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
            headerInfo[2].textContent = '1 / 1'
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

    if(params.quiz_type == 0)
        headerInfo[1].textContent = score.mcq
    else if(params.quiz_type == 1)
        headerInfo[1].textContent = score.buzzer
    else{
        headerInfo[1].textContent = score.buzzer + score.mcq
    }
}

function setMainDisplay(type){
    const marks = document.querySelectorAll(".marks-container div")
    if(type === "mcq"){
        console.log("inside setMainDisplay => mcq")
        for(let i=0;i<3;i++){
            responseBtns[i].classList.remove('hidden','disabled')
        }
        responseBtns[4].classList.add('hidden')
        
        marks[0].textContent = params.mcq_p
        marks[1].textContent = params.mcq_n
    }else{
        console.log("inside setMainDisplay => buzzer")
        for(let i=0;i<3;i++){
            responseBtns[i].classList.add('hidden')
        }
        responseBtns[4].classList.remove('hidden','disabled')

        marks[0].textContent = params.buzzer_p
        marks[1].textContent = params.buzzer_n
    }
}


function displayQuestion(questionData){
    console.log("inside DisplayQuestion")
    document.querySelector(".que-header div").textContent = currentQuestionIndex

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

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
for(let i = 0 ; i<3;i++){
    responseBtns[i].addEventListener('click',()=>{
        submitMcq(i + 1)
    })
}

responseBtns[4].addEventListener('click',()=>{
    submitBuzzer();
})