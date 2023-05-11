from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from chat import get_response, get_response_predictDisease

app = Flask(__name__)
CORS(app)


@app.post("/predict")
def predict():
    text = request.get_json().get("message")
    # TODO: check if text is valid
    response = get_response(text)
    message = {"answer": response}
    print('hello', message)
    return jsonify(message)


Rheumatologist = ['Osteoarthristis', 'Arthritis']

Cardiologist = ['Heart attack', 'Bronchial Asthma', 'Hypertension ']

ENT_specialist = ['(vertigo) Paroymsal  Positional Vertigo', 'Hypothyroidism']

Orthopedist = []

Neurologist = ['Varicose veins',
               'Paralysis (brain hemorrhage)', 'Migraine', 'Cervical spondylosis']

Allergist_Immunologist = ['Allergy', 'Pneumonia',
                          'AIDS', 'Common Cold', 'Tuberculosis', 'Malaria', 'Dengue', 'Typhoid']

Urologist = ['Urinary tract infection',
             'Dimorphic hemmorhoids(piles)']

Dermatologist = ['Acne', 'Chicken pox',
                 'Fungal infection', 'Psoriasis', 'Impetigo']

Gastroenterologist = ['Peptic ulcer disease', 'GERD', 'Chronic cholestasis', 'Drug Reaction', 'Gastroenteritis', 'Hepatitis E',
                      'Alcoholic hepatitis', 'Jaundice', 'hepatitis A',
                      'Hepatitis B', 'Hepatitis C', 'Hepatitis D', 'Diabetes ', 'Hypoglycemia']


@app.post("/predictDisease")
def predictDisease():
    text = request.get_json().get("message")

    result = get_response_predictDisease(text[1:])
    enteredSymptoms = result[0]
    predicted_disease = result[1]
    # print('predictedDisease', result)
    response = []
    response.append("You entered the following symptoms: ")
    response.append(enteredSymptoms)
    response.append(
        "As per your mentioned symptoms, the disease predicted is: ")
    response.append(predicted_disease)
    response.append("PLEASE NOTE: This tool does not provide medical advice. It is intended for informational purposes only. It is not a substitute for professional medical advice, diagnosis or treatment.")

    if predicted_disease in Rheumatologist:
        consultdoctor = "Rheumatologist"

    if predicted_disease in Cardiologist:
        consultdoctor = "Cardiologist"

    elif predicted_disease in ENT_specialist:
        consultdoctor = "ENT specialist"

    elif predicted_disease in Orthopedist:
        consultdoctor = "Orthopedist"

    elif predicted_disease in Neurologist:
        consultdoctor = "Neurologist"

    elif predicted_disease in Allergist_Immunologist:
        consultdoctor = "Allergist/Immunologist"

    elif predicted_disease in Urologist:
        consultdoctor = "Urologist"

    elif predicted_disease in Dermatologist:
        consultdoctor = "Dermatologist"

    elif predicted_disease in Gastroenterologist:
        consultdoctor = "Gastroenterologist"

    else:
        consultdoctor = "other"

    response.append(
        "This disease comes under the department of {}".format(consultdoctor))
    if consultdoctor != "other":
        response.append(
            "Please wait while we search for doctors with the specialization of {} ......".format(consultdoctor))
    message = {"answer": response, "specialization": consultdoctor}
    print('hello', message)
    return jsonify(message)


if __name__ == "__main__":
    app.run(debug=True, port=8001)
