import joblib
import random
import json
import os
import torch
import pickle
import numpy as np
# import sklearn
from scipy.stats import mode


from model import NeuralNet
from nltk_utils import bag_of_words, tokenize

path = os.getcwd()+'\HealthPlus_Chatbot\disease_prediction/rf_trained_model.pkl'
final_rf_model = joblib.load(path)

path = os.getcwd()+'\HealthPlus_Chatbot\disease_prediction/nb_trained_model.pkl'
final_nb_model = joblib.load(path)

path = os.getcwd()+'\HealthPlus_Chatbot\disease_prediction/svm_trained_model.pkl'
final_svm_model = joblib.load(path)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

path = os.getcwd()+'\HealthPlus_Chatbot\intents.json'
with open(path, 'r') as json_data:
    intents = json.load(json_data)

FILE = "data.pth"
data = torch.load(FILE)

input_size = data["input_size"]
hidden_size = data["hidden_size"]
output_size = data["output_size"]
all_words = data['all_words']
tags = data['tags']
model_state = data["model_state"]

model = NeuralNet(input_size, hidden_size, output_size).to(device)
model.load_state_dict(model_state)
model.eval()

bot_name = "Sam"


def get_response(msg):
    sentence = tokenize(msg)
    X = bag_of_words(sentence, all_words)
    X = X.reshape(1, X.shape[0])
    X = torch.from_numpy(X).to(device)

    output = model(X)
    _, predicted = torch.max(output, dim=1)

    tag = tags[predicted.item()]
    print('1', tag)

    probs = torch.softmax(output, dim=1)
    prob = probs[0][predicted.item()]
    if prob.item() > 0.75:
        print('2', prob.item())
        for intent in intents['intents']:
            if tag == intent["tag"]:
                print('3', intent)

                if tag[:11] == "faqQuestion":
                    return [intent['responses'], tag]

                return [random.choice(intent['responses']), tag]

    return ["I do not understand...", ""]


with open(os.getcwd()+'\HealthPlus_Chatbot\disease_prediction\data_dict.pkl', 'rb') as f:
    data_dict = pickle.load(f)


def get_response_predictDisease(symptoms):
    symptomList = symptoms.split(",")

    # creating input data for the models
    input_data = [0] * len(data_dict["symptom_index"])
    for symptom in symptomList:
        index = data_dict["symptom_index"][symptom]
        input_data[index] = 1

    # reshaping the input data and converting it
    # into suitable format for model predictions
    input_data = np.array(input_data).reshape(1, -1)
    print('input_data')
    print(input_data)

    # generating individual outputs
    rf_prediction = data_dict["predictions_classes"][final_rf_model.predict(input_data)[
        0]]
    nb_prediction = data_dict["predictions_classes"][final_nb_model.predict(input_data)[
        0]]
    svm_prediction = data_dict["predictions_classes"][final_svm_model.predict(input_data)[
        0]]

    # making final prediction by taking mode of all predictions
    final_prediction = mode([rf_prediction, nb_prediction, svm_prediction])
    predictions = {
        "rf_model_prediction": rf_prediction,
        "naive_bayes_prediction": nb_prediction,
        "svm_model_prediction": svm_prediction,
        "final_prediction": final_prediction[0][0]
    }
    # print(predictions)
    return (symptoms, predictions['final_prediction'])

    # return ["I do not understand...", ""]


if __name__ == "__main__":
    print("Let's chat! (type 'quit' to exit)")
    while True:
        # sentence = "do you use credit cards?"
        sentence = input("You: ")
        if sentence == "quit":
            break

        resp = get_response(sentence)
        print(resp)
