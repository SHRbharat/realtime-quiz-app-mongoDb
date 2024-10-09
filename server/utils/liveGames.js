// pin : ,
// hostId : socket-id (not fixed),
// gameLive : ,
// gameData { 
//     playerAnswered : 0,
//     questionLive : false,
//     buzzerPressed : false,
//     gameid : Data.id ,  {fixed}
//     question : 1,
//     quiz_type : 2,
//     time : 20,
//     no_mcq : ,
//     no_buzzzer : ,
//     marks : {
//         mcq_p : 20,
//         mcq_n : -10,
//         buzzer_p : 50,
//         buzzer_n : -40
//     }
// }
class LiveGames {
    constructor () {
        this.games = [];
    }
    addGame(pin, hostId, gameLive, gameData){
        var game = {pin, hostId, gameLive, gameData};
        this.games.push(game);
        return game;
    }
    removeGame(hostId){
        var game = this.getGame(hostId);
        
        if(game){
            this.games = this.games.filter((game) => game.hostId !== hostId);
        }
        return game;
    }
    getGame(hostId){
        return this.games.filter((game) => game.hostId === hostId)[0]
    }
}

module.exports = {LiveGames};