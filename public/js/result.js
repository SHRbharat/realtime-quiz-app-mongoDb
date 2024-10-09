var socket = io();
var params = jQuery.deparam(window.location.search);
let newLeader = ""

socket.on('connect',()=>{
    socket.emit('get-leaderboard',params.id)
})

//name , score (sorted)
socket.once('leaderboardData',(leaderboard)=>{
    if (leaderboard[0].name !== newLeader) {
        newLeader = leaderboard[0].name;
    }

    //render top-3
    let topThree = leaderboard.slice(0, 3);
    renderTopThree([topThree[2],topThree[0],topThree[1]]);
    renderAllPlayers(leaderboard);
})

socket.on('error',(err)=>{
    console.log(err)
})

// Data
// const cats = [
//     { name: "Milo", photo: "cat-1", points: 102 },
//     { name: "Clarence", photo: "cat-2", points: 88 },
//     { name: "Polly", photo: "cat-3", points: 97 },
//     { name: "Baxter", photo: "cat-4", points: 100 },
//     { name: "Jules", photo: "cat-5", points: 76 },
//     { name: "Lani", photo: "cat-6", points: 90 }
// ];

const trophy = [
    { r: 2, c: "#d6a21e" ,photo :"bronze"},
    { r: 0, c: "#d6cd1e" ,photo :"gold"},
    { r: 1, c: "#bbbbbb" ,photo :"silver"}
];


// function getSortedCats() {
//     return [...cats].sort((a, b) => b.points - a.points);
// }

// function getTopThree() {
//     let topThree = getSortedCats().slice(0, 3);
//     return [topThree[2], topThree[0], topThree[1]]; // Return as per the desired order
// }


function renderTopThree(topThree) {
    const topThreeCont = document.getElementById('topThreeCatsList');
    topThreeCont.innerHTML = '';

    // const topThreeCats = getTopThreeCats();
    topThree.forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="lead-cats">
                <img class="lead-cats__photo ${player.name === newLeader ? 'active' : ''}"
                    src="css/assets/${trophy[index].photo}.png">
                <div class="podium pod-${index + 1}">
                    <div class="ranking-lead" style="background-color: ${trophy[index].c}">
                        ${trophy[index].r + 1}
                    </div>
                    <h4>${player.name}</h4>
                    <p>${player.score} points</p>
                </div>
            </div>
        `;
        topThreeCont.appendChild(li);
    });
}

function renderAllPlayers(leaderboard) {
    const allPlayersList = document.getElementById('allCatsList');
    allPlayersList.innerHTML = '';

    leaderboard.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = 'cat-item';
        li.innerHTML = `
            <div class="cat-item__photo">
                <div class="ranking" style="background-color: ${index < 3 ? trophy[index].c : '#1ca1fa'}">
                    ${index + 1}
                </div>
                <img src="css/assets/${trophy[index].photo}.png">
            </div>
            <div class="cat-item__info">
                <h4>${player.name}</h4>
            </div>
            <div class="cat-item__points">
                <img src="https://www.sicontis.com/codepen/cpc-rising/chevron.svg" class="increment">
                <p>${player.score}</p>
                <img src="https://www.sicontis.com/codepen/cpc-rising/chevron.svg" class="decrement">
            </div>
        `;

        // Add event listeners for increment and decrement
        // li.querySelector('.increment').addEventListener('click', () => {
        //     cat.points++;
        //     updateLeaderboard();
        // });
        // li.querySelector('.decrement').addEventListener('click', () => {
        //     cat.points--;
        //     updateLeaderboard();
        // });

        allCatsList.appendChild(li);
    });
}

// Update and re-render the leaderboard
// function updateLeaderboard() {
//     const sortedCats = getSortedCats();
//     if (sortedCats[0].name !== newLeader) {
//         newLeader = sortedCats[0].name;
//     }
//     renderTopThreeCats();
//     renderAllCats();
// }

// Initial render
