const chatForm = document.getElementById('chat-form')
const chatMessages = document.querySelector('.chat-messages')
const userList = document.getElementById('users')

function formatMessage(username, text) {
   return {
      username,
      text,
      time: moment().format('h:mm a'),
   }
}

const socket = io('http://localhost:8000')

// console.log(username)
// console.log(room)

// Join chatroom
socket.emit('joinRoom', { username, room })

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
   outputUsers(users)
})

// Message from server
socket.on('mymessage', (message) => {
   // console.log(message)
   outputMyMessage(message)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
})

socket.on('othermessage', (message) => {
   // console.log(message)
   outputOtherMessage(message)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
})

socket.on('update', (message) => {
   // console.log(message)
   outputUpdateMessage(message)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
})

// Message submit
chatForm.addEventListener('submit', (e) => {
   e.preventDefault()

   // Get message text
   let msg = e.target.elements.msg.value

   msg = msg.trim()

   if (!msg) {
      return false
   }

   // Emit message to server
   socket.emit('chatMessage', msg)
   outputMyMessage(formatMessage('You', msg))

   // Clear input
   e.target.elements.msg.value = ''
   e.target.elements.msg.focus()
})

// Output rightside message to DOM
function outputMyMessage(message) {
   const div = document.createElement('div')
   div.classList.add('message')
   div.classList.add('mymessage')
   const p = document.createElement('p')
   p.classList.add('meta')
   p.innerText = message.username
   p.innerHTML += `  <span>${message.time}</span>`
   div.appendChild(p)
   const para = document.createElement('p')
   para.classList.add('text')
   para.innerText = message.text
   div.appendChild(para)
   document.querySelector('.chat-messages').appendChild(div)
}

// Output leftside message to DOM
function outputOtherMessage(message) {
   const div = document.createElement('div')
   div.classList.add('message')
   div.classList.add('othermessage')
   const p = document.createElement('p')
   p.classList.add('meta')
   p.innerText = message.username
   p.innerHTML += `  <span>${message.time}</span>`
   div.appendChild(p)
   const para = document.createElement('p')
   para.classList.add('text')
   para.innerText = message.text
   div.appendChild(para)
   document.querySelector('.chat-messages').appendChild(div)
}

// Output update to DOM
function outputUpdateMessage(message) {
   const div = document.createElement('div')
   div.classList.add('message')
   div.classList.add('update')
   div.classList.add('mb-2')
   div.innerText = message
   document.querySelector('.chat-messages').appendChild(div)
}

// Add users to DOM
function outputUsers(users) {
   userList.innerHTML = ''
   users.forEach((user) => {
      const li = document.createElement('li')
      li.innerText = user
      userList.appendChild(li)
   })
}

//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
   const leaveRoom = confirm('Are you sure you want to leave the chatroom?')
   if (leaveRoom) {
      window.location = '../index.html'
   } else {
   }
})
