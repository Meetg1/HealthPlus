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


@app.post("/predictDisease")
def predictDisease():
    text = request.get_json().get("message")

    result = get_response_predictDisease(text[1:])
    # print('predictedDisease', result)
    response = []
    response.append("You entered the following symptoms: ")
    response.append(result[0])
    response.append(
        "As per your mentioned symptoms, the disease predicted is: ")
    response.append(result[1])
    response.append("PLEASE NOTE: This tool does not provide medical advice. It is intended for informational purposes only. It is not a substitute for professional medical advice, diagnosis or treatment.")
    message = {"answer": response}
    print('hello', message)
    return jsonify(message)


if __name__ == "__main__":
    app.run(debug=True, port=8001)
