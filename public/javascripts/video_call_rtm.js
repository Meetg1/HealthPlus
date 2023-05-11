let diagRow = async () => {
    let diagnosisWrapper = document.getElementById('diagnosis')
    let newRowAdd =
        '<div class="form-row">' +
        '<div class="form-group col-md-6">' +
        '<label for="diag">Diagnosis</label>' +
        '<input type="text" class="form-control" id="diag" placeholder="Diabetes" name="diagnosis[]" required> </div>' +
        '<div class="form-group col-md-6"> <label for="dosage">Comment</label> <input type="text" class="form-control" id="dosage" placeholder="initial stage, severe..." name="diagnosis_comment[]" required> </div>' +
        '</div>';

    diagnosisWrapper.insertAdjacentHTML('beforeend', newRowAdd)
}

let medRow = async () => {
    let medicineWrapper = document.getElementById('meds')
    let newRowAdd =
        '<div class="form-row">' +
        '<div class="form-group col-md-6">' +
        '<label for="medicineName">Medicine Name</label>' +
        '<input type="text" class="form-control" id="medicineName" name="medicineName[]" placeholder="Crocin 500mg" required> </div>' +
        '<div class="form-group col-md-6">  <label for="dosage">Dosage</label> <input type="text" class="form-control" id="dosage" name="dosage[]" placeholder="0-1-0, 1-1-1, 2-1-2" required> </div>' +
        '</div>';

    medicineWrapper.insertAdjacentHTML('beforeend', newRowAdd)
}

let sendPrescUploaded = async (MemberId) => {
    client.sendMessageToPeer({
        text: 'presc_uploaded',
        filename: result.filename // assuming `result` includes the filename
    }, { MemberId }, function (err) {
        if (!err) {
            console.log('Prescription uploaded!');
        } else {
            console.log('Error uploading prescription:', err);
        }
    });
}

document.getElementById('rowAdder1').addEventListener('click', diagRow)
document.getElementById('rowAdder2').addEventListener('click', medRow)

$('#chatPresc').submit(function (e) {
    e.preventDefault()
    $.ajax({
        url: `/${roomId}/uploadChatPrescription`,
        type: 'POST',
        data: $(this).serialize(),

        success: function (result) {
            if (result.status == 'success') {
                alert('Prescription submitted successfully!')
                // Emit message to server
                client.sendMessageToPeer({
                    text: 'presc_uploaded',
                    filename: result.filename // assuming `result` includes the filename
                }, MemberId, function (err) {
                    if (!err) {
                        console.log('Prescription uploaded!');
                    } else {
                        console.log('Error uploading prescription:', err);
                    }
                });
                client.on('MessageFromPeer', function (message) {
                    if (message.text === 'presc_uploaded') {
                        //    const user = users[socket.id];
                        //    const peerId = user.peerId; // assuming you have the peerId of the current peer
                        const filename = message.filename; // assuming message includes filename

                        client.sendMessageToPeer({
                            text: 'patient_can_downloadnow',
                            filename: filename // assuming `filename` is defined
                        }, MemberId, { enableHistoricalMessaging: true }, function (err) {
                            if (!err) {
                                console.log('Patient can download now!');
                            } else {
                                console.log('Error sending message:', err);
                            }
                        });
                    }
                });


                client.on('MessageFromPeer', function (message) {
                    if (message.text === 'patient_can_downloadnow') {
                        const filename = message.filename; // assuming message includes filename
                        const presc_link = document.querySelector('.presc_link');
                        const no_presc_msg = document.querySelector('.no_presc_msg');
                        no_presc_msg.innerText =
                            'Prescription was uploaded. Click on below link to download it.';
                        presc_link.innerText = filename;
                        presc_link.classList.remove('invisible');
                    }
                });
            } else {
                alert('Something went wrong! Please try again.')
            }
        },
    })
})

