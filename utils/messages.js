const moment = require('moment')

function formatMessage(username, text) {
   return {
      username,
      text,
      time: moment().format('h:mm a'),
   }
}

function getRoomUsers(users, currentRoom) {
   const roomUsers = []
   for (const user in users) {
      if (users[user].room == currentRoom) {
         roomUsers.push(users[user].username)
      }
   }
   return roomUsers
}

module.exports = { formatMessage, getRoomUsers }
