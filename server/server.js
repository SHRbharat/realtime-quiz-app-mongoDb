//Import dependencies
const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");

const multer = require("multer");
const fs = require("fs");

//Import classes
const { LiveGames } = require("./utils/liveGames");
const { Players } = require("./utils/players");

const publicPath = path.join(__dirname, "../public");
var app = express();
var server = http.createServer(app);
var io = socketIO(server);

var games = new LiveGames();
var players = new Players();

//Mongodb setup
var { MongoClient, ObjectId } = require("mongodb");
var mongoose = require("mongoose");
var url = "mongodb://localhost:27017/";

app.use(express.static(publicPath));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(publicPath, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.body.gameId;
    cb(null, `${userId}_${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// File upload handler
app.post(
  "/upload",
  upload.fields([{ name: "images[]" }, { name: "audios[]" }]),
  (req, res) => {
    console.log("Files uploaded:", req.files);
    res.send("Files uploaded successfully.");
  }
);

// route to list files by user ID
// app.get("/files/:userId", (req, res) => {
//   const userId = req.params.userId;
//   const uploadDir = path.join(publicPath, "uploads");
//   console.log("reading", userId,uploadDir)
//   // Read the files from the upload directory
//   fs.readdir(uploadDir, (err, files) => {
//     if (err) {
//       return res.status(500).send("Error reading files");
//     }

//     // Filter files by userId prefix and valid extensions for images and audio
//     const userFiles = files.filter(file => file.startsWith(`${userId}_`));
//     const images = userFiles.filter(file => file.match(/\.(jpg|jpeg|png|gif)$/i)); // case-insensitive match for images
//     const audio = userFiles.filter(file => file.match(/\.(mp3|wav|ogg)$/i)); // case-insensitive match for audio

//     console.log(images,audio)
//     res.json({ images, audio });
//   });
// });

//Starting server on port 3000
server.listen(3000, () => {
  console.log("Server started on port 3000");
});

//When a connection to server is made from client
io.on("connection", (socket) => {
  console.log("<< connection established >>");
  socket.on("identifyUser", (data) => {
    if (data.role === "host") {
      console.log("Host connected:", socket.id);
    } else if (data.role === "player") {
      console.log("Player connected:", socket.id);
    }
  });

  // Check if a game exists using gamePin
  socket.on("check_game_pin", function (gamePin) {
    const gameExists = games.games.some((game) => game.pin == gamePin);
    socket.emit("game_pin_status", { exists: gameExists });
  });

  // When host requests for already created games' data
  socket.on("requestDbNames", function () {
    console.log("<< requestDbNames >>");

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.error("Database connection error:", err);
        socket.emit("error", "Failed to connect to the database."); // Send error to client
        return;
      }

      var dbo = db.db("kahootDB");
      dbo
        .collection("kahootGames")
        .find()
        .toArray(function (err, res) {
          if (err) {
            console.error("Database query error:", err);
            socket.emit("error", "Failed to query the database.");
            db.close();
            return;
          }

          // Emit games data to host
          socket.emit("gameNamesData", res);
          db.close();
        });
    });
  });

  // Handling save quiz requests
  socket.on("newQuiz", function (data) {
    console.log("<< newQuiz >>");

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.error("Database connection error:", err);
        socket.emit("error", "Failed to connect to the database.");
        return;
      }

      var dbo = db.db("kahootDB");
      dbo.collection("kahootGames").insertOne(data, function (err, res) {
        if (err) {
          console.error("Database insertion error:", err);
          socket.emit("error", "Failed to save the quiz."); // Send error to client
          db.close();
          return;
        }

        db.close();
        console.log("Game ID:", res.insertedId.toString());

        // socket.emit("gameId",res.insertedId.toString())
        //start the game immediately
        socket.emit("startGameFromCreator", res.insertedId.toString()); // Use the insertedId as the quiz ID
      });
    });
  });

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  //host/index.html
  //When host connects to the game , in lobby (lets players join the room)
  socket.on("host-join", (data) => {
    console.log("<< host-join >>");
    //Check to see if id passed in url corresponds to id of kahoot game in database
    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.error("Database connection error:", err);
        socket.emit("error", { message: "Database connection failed" });
        return;
      }

      var dbo = db.db("kahootDB");
      var query = { _id: ObjectId(data.id) };

      dbo
        .collection("kahootGames")
        .find(query)
        .toArray(function (err, result) {
          if (err) {
            console.error("Database query error:", err);
            socket.emit("error", { message: "Failed to retrieve game data" });
            db.close();
            return;
          }

          //A game was found with the id passed in url
          if (result[0] !== undefined) {
            var gamePin = Math.floor(Math.random() * 90000) + 10000; //new pin for game

            // Extract quiz_type, time, and marks from the result
            const { quiz_type, time, marks } = result[0];

            // Add the game to the collection of ongoing games
            games.addGame(gamePin, socket.id, false, {
              playersAnswered: 0,
              questionLive: false,
              gameid: data.id,
              question: 1,
              quiz_type: quiz_type,
              time: time,
              no_mcq: result[0].mcq_arr.length,
              no_buzzer: result[0].buzzer_arr.length,
              marks: marks,
              buzzerPressed: false,
            });

            // Get the game data using socket ID
            var game = games.getGame(socket.id);

            socket.join(game.pin); //The host is joining a room based on the pin

            console.log("Game Created with pin:", game.pin);

            //Sending game pin to host so they can display it for players to join
            // socket.emit("showGamePin", { });
            socket.emit("getGameInfo", {
              pin: game.pin,
              quiz_type: game.gameData["quiz_type"],
              time: game.gameData["time"],
              marks: game.gameData["marks"],
              no_mcq: game.gameData["no_mcq"],
              no_buzzer: game.gameData["no_buzzer"],
            });
          } else {
            console.warn("No game found with the provided ID:", data.id);
            socket.emit("noGameFound", {
              message: "No game found with the provided ID.",
            });
          }

          db.close(); // Close the database connection
        });
    });
  });

  // When the host starts the game , sends the host to dashboard
  socket.on("startGame", () => {
    console.log("<< startGame >>");
    var game = games.getGame(socket.id); // Get the game based on socket.id

    if (game) {
      game.gameLive = true;
      socket.emit("gameStarted", game.hostId); // Tell host that game has started
      // io.to(game.pin).emit("gameStarted", game.hostId); // Notify all participants that the game has started
    } else {
      console.error("Game not found for socket ID:", socket.id);
      socket.emit("error", "Failed to start the game."); // Send error to client
    }
  });

  //When the host connects from the game view, sends the first question and game data to host and
  //an event to particiapnts
  socket.on("host-join-game", (id) => {
    console.log("<< host-join-game >>");
    var oldHostId = id;
    var game = games.getGame(oldHostId); //Gets game with old host id

    if (game) {
      game.hostId = socket.id; //Changes the game host id to new host id
      socket.join(game.pin);

      //update host id of players
      var playerData = players.getPlayers(oldHostId);
      for (var i = 0; i < Object.keys(players.players).length; i++) {
        if (players.players[i].hostId == oldHostId) {
          players.players[i].hostId = socket.id;
        }
      }

      const gameid = game.gameData["gameid"]; //fixed, in database
      const quiz_type = game.gameData["quiz_type"]; //0->only mcqs, 1->only buzzers, 2->first mcqs then buzzers, 3->first buzzers then mcqs

      MongoClient.connect(url, function (err, db) {
        if (err) {
          console.error("Database connection error:", err);
          socket.emit("error", { message: "Database connection failed" });
          return;
        }

        var dbo = db.db("kahootDB");
        var query = { _id: ObjectId(gameid) };

        dbo
          .collection("kahootGames")
          .find(query)
          .toArray(function (err, res) {
            if (err) {
              console.error("Database query error:", err);
              socket.emit("error", { message: "Failed to retrieve game data" });
              db.close();
              return;
            }

            if (res.length === 0) {
              console.warn("No game found with the provided ID:", gameid);
              socket.emit("noGameFound", {
                message: "No game found with the provided ID.",
              });
              db.close();
              return;
            }

            // Handle different quiz types
            let questionData;
            if (quiz_type === 0) {
              // Only MCQs
              questionData = res[0].mcq_arr[0];
            } else if (quiz_type === 1) {
              // Only Buzzers
              questionData = res[0].buzzer_arr[0];
            } else if (quiz_type === 2) {
              // First MCQs, then Buzzers
              questionData =
                res[0].mcq_arr.length > 0
                  ? res[0].mcq_arr[0]
                  : res[0].buzzer_arr[0];
            } else if (quiz_type === 3) {
              // First Buzzers, then MCQs
              questionData =
                res[0].buzzer_arr.length > 0
                  ? res[0].buzzer_arr[0]
                  : res[0].mcq_arr[0];
            }

            if (questionData) {
              game.gameData.correctAnswer = questionData.correct;

              // Send question to host
              socket.emit("gameQuestions", {
                questionData,
                time: game.gameData["time"],
                playersCount: playerData.length,
              });
            } else {
              console.warn(
                "No questions available for the selected quiz type:",
                quiz_type
              );
              socket.emit("noQuestionsAvailable", {
                message: "No questions available.",
              });
            }

            db.close();
          });
      });

      //send players from lobby to game
      io.to(game.pin).emit("gameStartedPlayer");
      game.gameData.questionLive = true;
    } else {
      console.warn("No game found with old host ID:", oldHostId);
      socket.emit("noGameFound", {
        message: "No game found with the provided host ID.",
      });
    }
  });

  //When player connects for the first time, from the home screen
  socket.on("player-join", (params) => {
    console.log("<< player-join >>");
    var gameFound = false; //If a game is found with pin provided by player

    try {
      //For each game in the Games class
      for (var i = 0; i < games.games.length; i++) {
        //If the pin is equal to one of the game's pin
        if (params.pin == games.games[i].pin) {
          console.log("Player connected to game with pin:", params.pin);

          var hostId = games.games[i].hostId; //Get the id of host of game

          // Add player to the game
          players.addPlayer(hostId, socket.id, params.name, {
            answer: 0,
            score_mcq: 0,
            score_buzzer: 0,
          });

          // Player joins the room based on the pin
          socket.join(params.pin);

          // var playersInGame = players.getPlayers(hostId); //Get all players in the game
          //get name of players
          var playersInGame = players
            .getPlayers(hostId)
            .map((player) => player.name);

          // Send player data to the host for display in the lobby
          io.to(params.pin).emit("updatePlayerLobby", playersInGame);

          const resData = {
            gameId: games.games[i].gameData["gameid"],
            quiz_type: games.games[i].gameData["quiz_type"],
            time: games.games[i].gameData["time"],
            marks: games.games[i].gameData["marks"],
            no_mcq: games.games[i].gameData["no_mcq"],
            no_buzzer: games.games[i].gameData["no_buzzer"],
          }
          // Send game type to the player
          socket.emit("getGameInfo", resData);
          console.log("Game Data sent to player : " , resData)
          gameFound = true; // Game has been found
          break;
        }
      }

      // If the game was not found, notify the player
      if (!gameFound) {
        console.warn(`No game found with pin: ${params.pin}`);
        socket.emit("noGameFound", {
          message: "No game found with the provided pin.",
        });
      }
    } catch (error) {
      // Log any unexpected errors to the server console and inform the client
      console.error("Error in player-join:", error);
      socket.emit("error", {
        message:
          "An error occurred while trying to join the game. Please try again.",
      });
    }
  });

  //When the player connects from game view (for the first question)
  // socket.on("player-join-game", (data) => {
  //   var player = players.getPlayer(data.id);
  //   if (player) {
  //     var game = games.getGame(player.hostId);
  //     socket.join(game.pin);
  //     player.playerId = socket.id; //Update player id with socket id

  //     var playerData = players.getPlayers(game.hostId);
  //     socket.emit("playerGameData", playerData);
  //   } else {
  //     socket.emit("noGameFound"); //No player found
  //   }
  // });

  //When the player connects from the game view (for the first question)
  // socket.on("player-join-game", (data) => {
  //   var player = players.getPlayer(data.id);
  //   if (player) {
  //     var game = games.getGame(player.hostId);
  //     socket.join(game.pin);
  //     player.playerId = socket.id; // Update player id with socket id

  //     var playerData = players.getPlayers(game.hostId);

  //     // Construct game data to send
  //     var gameData = {
  //       quiz_type: game.gameData.quiz_type,
  //       time: game.gameData.time ,
  //       marks: game.gameData.marks
  //     };

  //     // Emit both player and game data to the connected player
  //     socket.emit("playerGameData", {
  //       playerData: playerData,
  //       gameData: gameData
  //     });
  //   } else {
  //     socket.emit("noGameFound"); // No player found
  //   }
  // });

  // When the player connects from the game view (for the first question), sends the first question, player data, and game data
  socket.on("player-join-game", (id) => {
    console.log("<< player-join-game >>");
    try {
      var player = players.getPlayer(id);

      // If player is found
      if (player) {
        var game = games.getGame(player.hostId);

        // Ensure game exists
        if (!game) {
          console.warn(`No game found for hostId: ${player.hostId}`);
          socket.emit("noGameFound");
          return;
        }

        socket.join(game.pin); // Player joins the game room
        player.playerId = socket.id; // Update player id with current socket id

        const playerData = {
          hostId: player.hostId,
          playerId: player.playerId,
          name: player.name,
        };

        // Fetch questions based on quiz_type
        const gameid = game.gameData["gameid"];
        const quiz_type = game.gameData["quiz_type"];

        MongoClient.connect(url, function (err, db) {
          if (err) {
            console.error("Error connecting to MongoDB:", err);
            socket.emit("error", { message: "Database connection error" });
            return;
          }

          var dbo = db.db("kahootDB");
          var query = { _id: ObjectId(gameid) };

          dbo
            .collection("kahootGames")
            .find(query)
            .toArray(function (err, res) {
              if (err) {
                console.error("Error fetching kahoot game data:", err);
                socket.emit("error", { message: "Error retrieving game data" });
                db.close();
                return;
              }

              if (!res.length) {
                console.warn(`No game found in database with id: ${gameid}`);
                socket.emit("noGameFound");
                db.close();
                return;
              }

              // Handle different quiz types
              let questionData;
              if (quiz_type === 0) {
                // Only MCQs
                questionData = res[0].mcq_arr[0];
              } else if (quiz_type === 1) {
                // Only Buzzers
                questionData = res[0].buzzer_arr[0];
              } else if (quiz_type === 2) {
                // First MCQs, then Buzzers
                questionData =
                  res[0].mcq_arr.length > 0
                    ? res[0].mcq_arr[0]
                    : res[0].buzzer_arr[0];
              } else if (quiz_type === 3) {
                // First Buzzers, then MCQs
                questionData =
                  res[0].buzzer_arr.length > 0
                    ? res[0].buzzer_arr[0]
                    : res[0].mcq_arr[0];
              }

              if (questionData) {
                let questionData_ = {
                  type: questionData.type,
                  que_hi: questionData.que_hi,
                  que_en: questionData.que_en,
                };

                if (questionData.type === "mcq") {
                  Object.assign(questionData_, {
                    op1: questionData.op1,
                    op2: questionData.op2,
                    op3: questionData.op3,
                    op4: questionData.op4,
                  });
                }

                if(questionData.media){
                  if(questionData.media.image){
                    Object.assign(questionData_ , {media : {image : questionData.media.image}})
                  }else{
                    Object.assign(questionData_ , {media : {audio : questionData.media.audio}})
                  }
                }
                // Emit player game data and the first question
                socket.emit("playerGameData", {
                  playerData: playerData,
                  time: game.gameData.time,
                  questionData: questionData_,
                });

                // Store the time when the question is sent to users
                player.gameData.responseTime = Date.now();
              } else {
                console.warn(
                  "No questions available for quiz_type:",
                  quiz_type
                );
                socket.emit("noQuestionsAvailable");
              }

              db.close();
            });
        });
      } else {
        console.warn(`Player not found with id: ${id}`);
        socket.emit("noGameFound"); // No player found
      }
    } catch (error) {
      // Catch any unexpected errors and notify the client
      console.error("Error in player-join-game:", error);
      socket.emit("error", { message: "An error occurred during the game." });
    }
  });

  // Move to the next question and send the leaderboard if questions are over
  socket.on("nextQuestion", function () {
    console.log("<< nextQuestion >>");
    // Get the game and reset players' current answers
    var game = games.getGame(socket.id);
    if (!game) {
      console.error("Game not found for socket ID:", socket.id);
      socket.emit("error", "Game not found."); // Send error to client
      return;
    }

    // Reset players' current answers
    var playerData = players.getPlayers(socket.id);
    for (var player of playerData) {
      player.gameData.answer = 0;
    }

    // Prepare for the next question
    game.gameData.playersAnswered = 0;
    game.gameData.questionLive = true;
    game.gameData.question += 1;

    // Retrieve the new question
    var gameid = game.gameData.gameid;
    let quiz_type = game.gameData.quiz_type;
    let que_index = game.gameData.question;

    MongoClient.connect(url, function (err, db) {
      if (err) {
        console.error("Database connection error:", err);
        socket.emit("error", "Failed to connect to the database."); // Send error to client
        return;
      }

      var dbo = db.db("kahootDB");
      var query = { _id: ObjectId(gameid) };
      dbo
        .collection("kahootGames")
        .find(query)
        .toArray(function (err, res) {
          if (err) {
            console.error("Database query error:", err);
            socket.emit("error", "Failed to query the database."); // Send error to client
            db.close();
            return;
          }

          let questionData = null;
          if (que_index <= res[0].mcq_arr.length + res[0].buzzer_arr.length) {
            // Handle different quiz types
            if (quiz_type === 0) {
              // Only MCQs
              questionData = res[0].mcq_arr[que_index - 1];
            } else if (quiz_type === 1) {
              // Only Buzzers
              questionData = res[0].buzzer_arr[que_index - 1];
            } else if (quiz_type === 2) {
              // First MCQs, then Buzzers
              questionData =
                que_index <= res[0].mcq_arr.length
                  ? res[0].mcq_arr[que_index - 1]
                  : res[0].buzzer_arr[que_index - res[0].mcq_arr.length - 1];
            } else if (quiz_type === 3) {
              // First Buzzers, then MCQs
              questionData =
                que_index <= res[0].buzzer_arr.length
                  ? res[0].buzzer_arr[que_index - 1]
                  : res[0].mcq_arr[que_index - res[0].buzzer_arr.length - 1];
            }

            if (questionData) {
              game.gameData.correctAnswer = questionData.correct;
              // Send question to host and participants
              socket.emit("gameQuestions", {
                questionData: questionData,
                time: game.gameData.time,
                playersCount: playerData.length,
              });

              let questionData_ = {
                type: questionData.type,
                que_hi: questionData.que_hi,
                que_en: questionData.que_en,
              };

              if (questionData.type === "mcq") {
                Object.assign(questionData_, {
                  op1: questionData.op1,
                  op2: questionData.op2,
                  op3: questionData.op3,
                  op4: questionData.op4,
                });
              }

              if(questionData.media){
                if(questionData.media.image){
                  Object.assign(questionData_ , {media : {image : questionData.media.image}})
                }else{
                  Object.assign(questionData_ , {media : {audio : questionData.media.audio}})
                }
              }

              io.to(game.pin).emit("nextQuestionPlayer", {
                questionData: questionData_,
              });
              //save the time , when the question was sent
              playerData.forEach(
                (player) => (player.gameData.responseTime = Date.now())
              );
            } else {
              console.log("No question data available for index:", que_index);
              socket.emit("error", "No question data available."); // Send error to client
            }
          } else {
            // Send the final leaderboard if no more questions
            var playersInGame = players.getPlayers(game.hostId);
            io.to(game.pin).emit("GameOver", playersInGame);
          }

          db.close();
        });
    });
  });

  //send final leaderboard
  socket.on("get-leaderboard", (id) => {
    console.log("<< get-leaderboard >>");
    try {
      var player = players.getPlayer(id);

      // If player is found
      if (player) {
        var game = games.getGame(player.hostId);

        // Ensure game exists
        if (!game) {
          console.warn(`No game found for hostId: ${player.hostId}`);
          socket.emit("noGameFound");
          return;
        }

        player.playerId = socket.id; // Update player id with current socket id

        // Get all players in the game
        var playersInGame = players.getPlayers(game.hostId);

        if (!playersInGame || playersInGame.length === 0) {
          console.error("No players found for game:", game.pin);
          socket.emit("error", "No players found.");
          return;
        }

        // Sort players by their scores
        playersInGame.sort(
          (a, b) =>
            b.gameData.score_mcq +
            b.gameData.score_buzzer -
            (a.gameData.score_mcq + a.gameData.score_buzzer)
        );

        // Create leaderboard data
        const leaderboardData = playersInGame.map((player) => ({
          name: player.name,
          score: player.gameData.score_mcq + player.gameData.score_buzzer,
        }));

        // Send leaderboard data back to the requesting client
        socket.emit("leaderboardData", { leaderboard: leaderboardData });

        // Log the leaderboard for debugging
        console.log("Leaderboard sent to client:", leaderboardData);
      }
    } catch (error) {
      console.log("error : ", error);
      socket.emit("error", error);
    }
  });

  // Handle player's answer submission
  socket.on("playerAnswer", (num) => {
    console.log("<< playerAnswer >>");
    var player = players.getPlayer(socket.id);
    if (!player) {
      console.log("error : player not found");
      socket.emit("error", "Player not found");
      return;
    }

    var hostId = player.hostId;
    var game = games.getGame(hostId);
    if (!game) {
      socket.emit("error", "Game not found");
      return;
    }

    // Check if the response is within the time limit (with a +2s delay for network transmission issues)
    let questionSentTime = player.gameData.responseTime;
    let responseReceivedTime = Date.now();
    let responseTimeAllowed = game.gameData.time + 2; // Adding 2 seconds tolerance
    console.log(
      "Player answered:",
      player,
      num,
      questionSentTime,
      responseReceivedTime,
      (responseReceivedTime - questionSentTime) / 1000,
      responseTimeAllowed
    );

    if (game.gameData.questionLive) {
      // Only process answer if the question is still live
      player.gameData.answer = num;
      game.gameData.playersAnswered += 1;

      // Check if the response was within the allowed time limit
      if (
        (responseReceivedTime - questionSentTime) / 1000 <=
        responseTimeAllowed
      ) {
        // Handle MCQ answers
        
        if (num >= 1 && num <= 4) {
          if (num == game.gameData.correctAnswer) {
            player.gameData.score_mcq += game.gameData.marks.mcq_p; // Positive score for correct answer
            socket.emit("answerResult", "true");
          } else {
            player.gameData.score_mcq += game.gameData.marks.mcq_n; // Negative score for wrong answer
            socket.emit("answerResult", "false");
          }
        }
      } else {
        socket.emit("answerResult", "NA"); // Response after time limit
      }

      // Check if all players have answered (MCQ)
      if (num >= 1 && num <= 4) {
        var playerNum = players.getPlayers(hostId); // Get total players
        if (game.gameData.playersAnswered === playerNum.length) {
          game.gameData.questionLive = false; // End question since all players answered
          var playerData = players.getPlayers(game.hostId);
          io.to(game.pin).emit("questionOver", playerData);
        } else {
          // Update host with the number of players who have answered so far
          console.log("Players answered : ", game.gameData.playersAnswered)
          io.to(game.pin).emit(
            "updatePlayersAnswered",
            game.gameData.playersAnswered
          );
        }
      }
    } else {
      socket.emit("answerResult", "Question not live");
    }
  });

  socket.on("playerBuzzered", () => {
    console.log(`<< playerBuzzered >>`);
    var player = players.getPlayer(socket.id);
    if (!player) {
      console.log("error : player not found");
      socket.emit("error", "Player not found");
      return;
    }
    console.log(`${player.name} pressed the buzzer`);

    var hostId = player.hostId;
    var game = games.getGame(hostId);
    if (!game) {
      socket.emit("error", "Game not found");
      return;
    }

    if (!game.gameData.buzzerPressed) {
      //record the buzzer
      game.gameData.buzzerPressed = true;
      console.log("buzzer recorded");
      socket.emit("buzzerAck", { ack: true });
      io.to(game.pin).emit("firstToBuzzer", {
        hostId: player.hostId,
        PlayerId: player.playerId,
        name: player.name,
      });
    } else {
      socket.emit("buzzerAck", { ack: false });
    }
  });

  // Host updates the result of a single buzzer response
  socket.on("updateBuzzerScores", (data) => {
    console.log("<< updateBuzzerScores >>");
    var player = players.getPlayer(data.player.playerId);
    if (!player) {
      socket.emit("error", "Player not found");
      return;
    }

    var game = games.getGame(player.hostId);
    if (!game) {
      socket.emit("error", "Game not found");
      return;
    }
    game.gameData.buzzerPressed = true;

    // Update the player's b uzzer score based on the host's decision
    if (data.res === true) {
      player.gameData.score_buzzer += game.gameData.marks.buzzer_p; // Award points for a correct answer
    } else {
      player.gameData.score_buzzer += game.gameData.marks.buzzer_n; // Deduct points for a wrong answer
    }

    // Fetch updated player data
    var playerData = players.getPlayers(game.hostId);

    //send leaderboard to only host
    // socket.emit("questionOver", {
    //   playerData,
    //   correctAnswer: data.correctAnswer,
    // });

    // //broadcast buzzered player to all socekts ,except host
    // socket.broadcast.to(game.pin).emit("questionOver", player)
    // io.sockets.sockets.get(socket.id)?.emit('skip-event'); // Optionally inform the host, or ensure the host is excluded.
    
    io.to(game.pin).emit("questionOver", {playerData});
  });

  // When a player requests their score
  socket.on("getScore", () => {
    console.log("<< getScore >>");
    // Retrieve player data using the socket ID
    var player = players.getPlayer(socket.id);

    // Check if the player exists
    if (player) {
      // Emit the player's scores for MCQ and Buzzer rounds
      socket.emit("newScore", {
        mcq: player.gameData.score_mcq,
        buzzer: player.gameData.score_buzzer,
      });
    } else {
      // Emit an error if the player was not found
      socket.emit("error", "Player not found");
    }
  });

  // When time runs out for answering MCQs
  socket.on("timeUp", () => {
    console.log("<< timeUp >>");
    // Retrieve the game associated with the socket ID
    var game = games.getGame(socket.id);

    // Check if the game exists
    if (game) {
      // End the question period
      game.gameData.questionLive = false;

      // Retrieve player data for the host
      var playerData = players.getPlayers(game.hostId);

      // console.log("Time's up: ", playerData);

      // Notify all players that the question period is over
      // io.to(game.pin).emit("questionOver", {
      //   playerData,
      //   correctAnswer: game.gameData.correctAnswer,
      // });
      io.to(game.pin).emit("questionOver", playerData);
    } else {
      // Handle the case where the game is not found
      console.error("Game not found for socket ID:", socket.id);
      socket.emit("error", "Game not found");
    }
  });

  // When a host or player disconnects from the site
  socket.on("disconnect", () => {
    console.log("<< disconnect >>");
    try {
      var game = games.getGame(socket.id); // Check if the socket belongs to a host

      // If a game is found, it means the disconnected socket belongs to a host
      if (game) {
        if (!game.gameLive) {
          // Game is not live, meaning the host left before the game started
          games.removeGame(socket.id); // Remove the game from the games list
          console.log("Game ended with pin:", game.pin);

          var playersToRemove = players.getPlayers(game.hostId); // Get all players in the game

          // Remove all players from the game
          playersToRemove.forEach((player) => {
            players.removePlayer(player.playerId);
          });

          // Notify all players that the host has disconnected
          io.to(game.pin).emit("hostDisconnect");

          socket.leave(game.pin); // Host socket leaves the room
        }
      } else {
        // No game found for the socket, meaning the socket belongs to a player
        var player = players.getPlayer(socket.id);

        // If a player is found with the socket ID
        if (player) {
          var hostId = player.hostId; // Get the host ID of the game
          var game = games.getGame(hostId); // Get the game associated with the host ID

          // If the game is not live, proceed with removing the player
          if (!game.gameLive) {
            var pin = game.pin; // Get the game pin

            players.removePlayer(socket.id); // Remove the player from the game
            var playersInGame = players.getPlayers(hostId); // Get remaining players in the game

            // Update the host's lobby with the remaining players
            io.to(pin).emit("updatePlayerLobby", playersInGame);

            socket.leave(pin); // Player socket leaves the room
          }
        }
      }
    } catch (error) {
      // Log any unexpected errors and avoid crashing the server
      console.error("Error in disconnect handler:", error);
    }
  });
});
