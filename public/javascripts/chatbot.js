class Chatbox {
    constructor() {
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            chatBox: document.querySelector('.chatbox__support'),
            actionButtons: document.querySelectorAll('.action-btn'),
            sendButton: document.querySelector('.send__button')
        }

        this.state = false;
        // this.messages = [];
    }

    display() {
        const { openButton, chatBox, actionButtons, sendButton } = this.args;

        openButton.addEventListener('click', () => this.toggleState(chatBox))

        sendButton.addEventListener('click', () => this.onSendButton(chatBox))

        // console.log('helle')
        // console.log(actionButtons)
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
                console.log('rrrr')
                console.log(r)
                let msg2 = { name: "Sam", message: r.answer[0] };
                // this.messages.push(msg2);
                this.updateChatText(chatbox, msg2)

                let tag = r.answer[1]
                if (tag == 'faq') {
                    this.handleFaqAction(chatbox)
                }

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

    handleFaqAction(chatbox) {
        const div = document.createElement("div")
        div.classList.add('messages__item', 'messages__item--visitor')
        const a = document.createElement("a")
        a.setAttribute('href', '/faqs')
        a.textContent = 'Click here to view all FAQs. OR ask another question directly.'
        div.appendChild(a)

        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.appendChild(div);

        var objDiv = document.getElementById("chatbox__messages__id");
        objDiv.scrollTop = objDiv.scrollHeight;
    }
}

const chatbox = new Chatbox();
chatbox.display();

