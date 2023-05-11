class Chatbox {
    constructor() {
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            chatBox: document.querySelector('.chatbox__support'),
            actionButtons: document.querySelectorAll('.action-btn'),
            sendButton: document.querySelector('.send__button')
        }

        this.state = false;
        this.isDiseasePredictor = false
        this.enteredSymptoms = ""
    }

    display() {
        const { openButton, chatBox, actionButtons, sendButton } = this.args;

        openButton.addEventListener('click', () => this.toggleState(chatBox))

        sendButton.addEventListener('click', () => this.onSendButton(chatBox))

        actionButtons.forEach(actionButton => {
            actionButton.addEventListener('click', (ele) => {
                this.handleActionButton(chatBox, ele)
            })
        })

        const node = chatBox.querySelector('input');
        node.addEventListener("keyup", ({ key }) => {
            if (key === "Enter") {
                this.onSendButton(chatBox)
            }
        })
    }

    toggleState(chatbox) {
        this.state = !this.state;
        // show or hides the box
        if (this.state) {
            chatbox.classList.add('chatbox--active')
        } else {
            chatbox.classList.remove('chatbox--active')
        }
    }

    handleActionButton(chatbox, ele) {
        // console.log(ele.target.innerHTML)
        chatbox.querySelector('input').value = ele.target.innerHTML
        this.onSendButton(chatbox)
    }

    onSendButton(chatbox) {

        var textField = chatbox.querySelector('input');
        let text1 = textField.value
        if (text1 === "") {
            return;
        }

        if (text1.toLowerCase() == "stop") {
            const symptomContainer = document.getElementById('myDropdown')
            symptomContainer.style.display = 'none'
            this.isDiseasePredictor = false
            // console.log('ha')
            // console.log(this.enteredSymptoms)
            fetch('http://127.0.0.1:8001/predictDisease', {
                method: 'POST',
                body: JSON.stringify({ message: this.enteredSymptoms }),
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(r => r.json())
                .then(r => {
                    this.enteredSymptoms = ""
                    this.handleDiseasePredictionAction(chatbox, r.answer, r.specialization)
                    return
                }).catch((error) => {
                    console.error('Error:', error);
                });
            textField.value = ''
            return
        }

        if (this.isDiseasePredictor == true) {

            // console.log(text1)
            this.enteredSymptoms = this.enteredSymptoms + ',' + text1
            // console.log('aa', this.enteredSymptoms)
            let msg1 = { name: "User", message: text1 }
            this.updateChatText(chatbox, msg1)
            textField.value = ''
            return
        }

        let msg1 = { name: "User", message: text1 }
        // this.messages.push(msg1);
        this.updateChatText(chatbox, msg1)

        fetch('http://127.0.0.1:8001/predict', {
            method: 'POST',
            body: JSON.stringify({ message: text1 }),
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(r => r.json())
            .then(r => {
                // console.log('rrrr')
                // console.log(r)
                let msg2 = { name: "Sam", message: r.answer[0] };
                let tag = r.answer[1]


                if (tag == 'faq') {

                    // this.messages.push(msg2);
                    this.updateChatText(chatbox, msg2)
                    this.handleFaqAction(chatbox)
                } else if (tag.slice(0, 11) == 'faqQuestion') {
                    // console.log('r.answer')
                    // console.log(r.answer)

                    this.handleFaqQuestionAction(chatbox, r.answer[0])
                } else if (tag == 'diseasePrediction') {

                    // this.messages.push(msg2);
                    this.updateChatText(chatbox, msg2)
                    const symptomContainer = document.getElementById('myDropdown')
                    symptomContainer.style.display = 'block'

                    this.isDiseasePredictor = true
                } else if (tag == 'nearbyDoctors') {
                    const userLocation = currUser.location
                    this.updateChatText(chatbox, { name: "Sam", message: `You are located in the city: ${userLocation}. Searching doctors nearby.......` })

                    fetch(`/getNearbyDoctors/${userLocation}`, {
                        method: 'GET',
                    })
                        .then(r => r.json())
                        .then(r => {

                            if (r.status == "nodoctors") {
                                this.updateChatText(chatbox, { name: "Sam", message: "Sorry, no doctors found near your location." })
                                return
                            }

                            this.nearByDoctorsDiv(chatbox, r.doctors)


                        }).catch((error) => {
                            console.error('Error:', error);
                        });

                }

                // this.updateChatText(chatbox, msg2)
                textField.value = ''

            }).catch((error) => {
                console.error('Error:', error);
                // this.updateChatText(chatbox, error)
                // textField.value = ''
            });
    }

    updateChatText(chatbox, msg) {
        const div = document.createElement("div")

        // this.messages.slice().reverse().forEach(function (item, index) {
        if (msg.name === "Sam") {
            div.classList.add('messages__item', 'messages__item--visitor')
        }
        else {
            div.classList.add('messages__item', 'messages__item--operator')
        }
        // });
        div.textContent = msg.message

        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.appendChild(div);

        var objDiv = document.getElementById("chatbox__messages__id");
        objDiv.scrollTop = objDiv.scrollHeight;
    }

    nearByDoctorsDiv(chatbox, doctors) {

        // Returns a Promise that resolves after "ms" Milliseconds
        const timer = ms => new Promise(res => setTimeout(res, ms))



        async function load() { // We need to wrap the loop into an async function for this to work

            await timer(2500);

            for (const doctor of doctors) {

                const div = document.createElement("div")
                div.classList.add('messages__item', 'messages__item--visitor')
                div.textContent = `Doctors found in the city: ${doctor.loc}`

                const chatmessage = chatbox.querySelector('.chatbox__messages');
                chatmessage.appendChild(div);

                var objDiv = document.getElementById("chatbox__messages__id");
                objDiv.scrollTop = objDiv.scrollHeight;

                await timer(2500); // then the created Promise can be awaited

                for (const doc of doctor.doctors) {

                    const div = document.createElement("div")
                    div.classList.add('messages__item', 'messages__item--visitor')
                    const a = document.createElement("a")
                    a.setAttribute('href', `/doctor_specific/profile/${doc._id.toString()}`)
                    a.textContent = `Doctor Name: ${doc.first_name + ' ' + doc.last_name}`
                    div.appendChild(a)
                    const p = document.createElement("p")
                    p.textContent = `Experience: ${doc.yearsOfExperience} years,                           Rating: ${doc.ratings}, Clinic location: ${doc.clinicLocation}, Consultation fee: ${doc.consultationFee} ₹  `
                    div.appendChild(p)

                    const chatmessage = chatbox.querySelector('.chatbox__messages');
                    chatmessage.appendChild(div);

                    var objDiv = document.getElementById("chatbox__messages__id");
                    objDiv.scrollTop = objDiv.scrollHeight;

                    // await timer(2500); // then the created Promise can be awaited
                }

            }
        }
        load();
    }


    handleFaqAction(chatbox) {
        const div = document.createElement("div")
        div.classList.add('messages__item', 'messages__item--visitor')
        const a = document.createElement("a")
        a.setAttribute('href', '/')
        a.textContent = 'Click here to visit our home page to know more about us. OR ask another question directly.'
        div.appendChild(a)

        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.appendChild(div);

        var objDiv = document.getElementById("chatbox__messages__id");
        objDiv.scrollTop = objDiv.scrollHeight;
    }



    handleFaqQuestionAction(chatbox, msges) {

        // Returns a Promise that resolves after "ms" Milliseconds
        const timer = ms => new Promise(res => setTimeout(res, ms))

        async function load() { // We need to wrap the loop into an async function for this to work
            for (const msg of msges) {

                const div = document.createElement("div")
                div.classList.add('messages__item', 'messages__item--visitor')

                div.textContent = msg

                const chatmessage = chatbox.querySelector('.chatbox__messages');
                chatmessage.appendChild(div);

                var objDiv = document.getElementById("chatbox__messages__id");
                objDiv.scrollTop = objDiv.scrollHeight;

                await timer(2500); // then the created Promise can be awaited

            }
        }

        load();
    }

    doctorSuggestDiv(chatbox, doctors) {

        // Returns a Promise that resolves after "ms" Milliseconds
        const timer = ms => new Promise(res => setTimeout(res, ms))

        async function load() { // We need to wrap the loop into an async function for this to work

            for (const doctor of doctors) {
                const div = document.createElement("div")
                div.classList.add('messages__item', 'messages__item--visitor')
                const a = document.createElement("a")
                a.setAttribute('href', `/doctor_specific/profile/${doctor._id.toString()}`)
                a.textContent = `Doctor Name: ${doctor.first_name + ' ' + doctor.last_name}`
                div.appendChild(a)
                const p = document.createElement("p")
                p.textContent = `Experience: ${doctor.yearsOfExperience} years,                            Rating: ${doctor.ratings}, Clinic location: ${doctor.clinicLocation}, Consultation fee: ${doctor.consultationFee} ₹  `
                div.appendChild(p)

                const chatmessage = chatbox.querySelector('.chatbox__messages');
                chatmessage.appendChild(div);

                var objDiv = document.getElementById("chatbox__messages__id");
                objDiv.scrollTop = objDiv.scrollHeight;

                await timer(2500); // then the created Promise can be awaited
            }
        }
        load();
    }

    async handleDiseasePredictionAction(chatbox, msges, spec) {
        // Returns a Promise that resolves after "ms" Milliseconds
        const timer = ms => new Promise(res => setTimeout(res, ms))

        async function load() { // We need to wrap the loop into an async function for this to work
            for (const msg of msges) {

                const div = document.createElement("div")
                div.classList.add('messages__item', 'messages__item--visitor')

                div.textContent = msg

                const chatmessage = chatbox.querySelector('.chatbox__messages');
                chatmessage.appendChild(div);

                var objDiv = document.getElementById("chatbox__messages__id");
                objDiv.scrollTop = objDiv.scrollHeight;

                await timer(2500); // then the created Promise can be awaited

            }
        }

        await load();

        fetch(`/getDoctorBySpecialization`, {
            method: 'POST',
            body: JSON.stringify({ spec: spec }),
            // mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(r => r.json())
            .then(r => {
                // console.log('rrrr')
                // console.log(r.doctors)

                // chatResp = []

                if (r.doctors.length == 0) {
                    this.updateChatText(chatbox, { name: "Sam", message: "Sorry, no doctors found under that specialization." })
                } else {
                    this.updateChatText(chatbox, { name: "Sam", message: `${r.doctors.length} doctors found!` })
                    this.doctorSuggestDiv(chatbox, r.doctors)
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                // this.updateChatText(chatbox, error)
                // textField.value = ''
            });
    }

}

const chatbox = new Chatbox();
chatbox.display();


