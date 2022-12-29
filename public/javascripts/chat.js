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

socket.on('otherPhotoMessage', (message) => {
   outputOtherPhotoMessage(message)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
})

socket.on('myPhotoMessage', (message) => {
   outputMyPhotoMessage(message)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
})

socket.on('update', (message) => {
   // console.log(message)
   outputUpdateMessage(message)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
})

socket.on('patient_can_downloadnow', (filename) => {
   const presc_link = document.querySelector('.presc_link')
   const no_presc_msg = document.querySelector('.no_presc_msg')
   no_presc_msg.innerText =
      'Prescription was uploaded. Click on below link to download it.'
   presc_link.innerText = filename
   presc_link.classList.remove('invisible')
})

$('.presc_link').click(function (e) {
   e.preventDefault()
   window.location.href = `/${e.target.innerText}`
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

$('#chatPresc').submit(function (e) {
   $.ajax({
      url: `/${room}/uploadChatPrescription`,
      type: 'POST',
      data: new FormData(this),
      processData: false,
      contentType: false,
      success: function (result) {
         if (result.status == 'success') {
            alert('Prescription submitted successfully!')
            // Emit message to server
            socket.emit('presc_uploaded', result.filename)
         } else {
            alert('Something went wrong! Please try again.')
         }
      },
   })
   e.preventDefault()
})

function sendPhoto(files) {
   socket.emit('sendPhoto', files[0], (status) => {
      // console.log(status)
   })
}

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

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
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

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
}

function outputMyPhotoMessage(message) {
   const div = document.createElement('div')
   div.classList.add('message')
   div.classList.add('mymessage')
   const p = document.createElement('p')
   p.classList.add('meta')
   p.innerText = message.username
   p.innerHTML += `  <span>${message.time}</span>`
   div.appendChild(p)
   const image = document.createElement('img')
   image.src = message.text
   image.classList.add('chat-img')
   div.appendChild(image)
   document.querySelector('.chat-messages').appendChild(div)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
}

function outputOtherPhotoMessage(message) {
   const div = document.createElement('div')
   div.classList.add('message')
   div.classList.add('othermessage')
   const p = document.createElement('p')
   p.classList.add('meta')
   p.innerText = message.username
   p.innerHTML += `  <span>${message.time}</span>`
   div.appendChild(p)
   const image = document.createElement('img')
   image.src = message.text
   image.classList.add('chat-img')
   div.appendChild(image)
   document.querySelector('.chat-messages').appendChild(div)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
}

// Output update to DOM
function outputUpdateMessage(message) {
   const div = document.createElement('div')
   div.classList.add('message')
   div.classList.add('update')
   div.classList.add('mb-2')
   div.innerText = message
   document.querySelector('.chat-messages').appendChild(div)

   // Scroll down
   chatMessages.scrollTop = chatMessages.scrollHeight
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
