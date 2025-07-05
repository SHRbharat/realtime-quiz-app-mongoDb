# 🎯 Real-Time Quiz Application (Socket.IO + Express + MongoDB)

A real-time multiplayer quiz app built using **Node.js**, **Express.js**, **Socket.IO**, and **MongoDB**. Users can join live quiz rooms, answer questions in real-time, and compete with others.

---

## 🚀 Features

- 🔌 Real-time communication via WebSockets
- 👥 Multi-user quiz rooms
- ⏱️ Timed questions
- 📊 Real-time score updates
- 🧠 Quiz data from MongoDB

---

## 📦 Tech Stack

| Tech        | Description                           |
|-------------|---------------------------------------|
| Node.js     | Backend runtime                       |
| Express.js  | API & server routing                  |
| Socket.IO   | Real-time bi-directional communication |
| MongoDB     | Database for storing quizzes/questions |
| HTML/CSS/JS | Frontend interface                    |

---

## 🔧 Installation & Setup

### Prerequisites

- Node.js installed
- MongoDB running locally or hosted

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/realtime-quiz-app.git
cd realtime-quiz-app

# 2. Install dependencies
npm install

# 3. Start MongoDB (if local)
mongod

# 4. Run the Node server
node server/server.js
