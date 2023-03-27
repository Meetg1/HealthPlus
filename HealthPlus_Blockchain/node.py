from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from wallet import Wallet
from blockchain import Blockchain

app = Flask(__name__)
CORS(app)


# POST - Wallet
@app.route('/wallet', methods=['POST'])
def create_keys():
    wallet.create_keys()
    if wallet.save_keys():
        # We reinitialise blockchain since we're using a POST request and also
        # instruct function to use global blockchain variable
        global blockchain
        blockchain = Blockchain(wallet.public_key, port)
        response = {
            'public_key': wallet.public_key,
            'private_key': wallet.private_key
        }
        return jsonify(response), 201
    else:
        response = {
            'message': 'Saving keys failed.'
        }
        return jsonify(response), 500


# GET - Wallet
@app.route('/wallet', methods=['GET'])
def load_keys():
    if wallet.load_keys():
        global blockchain
        blockchain = Blockchain(wallet.public_key, port)
        response = {
            'public_key': wallet.public_key,
            'private_key': wallet.private_key
        }
        return jsonify(response), 201
    else:
        response = {
            'message': 'Loading the keys failed.'
        }
        return jsonify(response), 500


#=======================================
# GET - Balance
@app.route('/balance', methods=['GET'])
def get_balance():
    balance = blockchain.get_balance()
    if balance != None:
        response = {
            'message': 'Fetched balance successfully.',
            'funds': balance
        }
        return jsonify(response), 200
    else:
        response = {
            'messsage': 'Loading balance failed.',
            'wallet_set_up': wallet.public_key != None
        }
        return jsonify(response), 500
#=======================================

# POST - Broadcast Transaction Information to Peer Nodes
@app.route('/broadcast-transaction', methods=['POST'])
def broadcast_transaction():
    values = request.get_json()
    if not values:
        response = {'message': 'No data found.'}
        return jsonify(response), 400
    required = ['sender', 'doctor', 'patient', 'data', 'signature']
    if not all(key in values for key in required):
        response = {'message': 'Some data is missing.'}
        return jsonify(response), 400
    success = blockchain.add_transaction(values['doctor'],
        values['patient'], values['sender'], values['signature'], values['data'], is_receiving=True)
    if success:
        response = {
            'message': 'Successfully added transaction.',
            'transaction': {
                'sender': values['sender'],
                'doctor': values['doctor'],
                'patient': values['patient'],
                'data': values['data'],
                'signature': values['signature']
            }
        }
        return jsonify(response), 201
    else:
        response = {
            'message': 'Creating a transaction failed.'
        }
        return jsonify(response), 500


# POST - Broadcast Mined Block Information to Peer Nodes
@app.route('/broadcast-block', methods=['POST'])
def broadcast_block():
    values = request.get_json()
    if not values:
        response = {'message': 'No data found.'}
        return jsonify(response), 400
    if 'block' not in values:
        response = {'message': 'Some data is missing.'}
        return jsonify(response), 400
    block = values['block']
    if block['index'] == blockchain.chain[-1].index + 1:
        if blockchain.add_block(block):
            response = {'message': 'Block added'}
            return jsonify(response), 201
        else:
            response = {'message': 'Block seems invalid.'}
            return jsonify(response), 500
    elif block['index'] > blockchain.chain[-1].index:
        return jsonify(response), 900
        pass
    else: 
        response = {'message': 'Blockchain seems to be shorter, block not added'}
        return jsonify(response), 409



# POST - Mine a block (add a new block to the blockchain)
@app.route('/mine', methods=['POST'])
def mine():
    block = blockchain.mine_block()
    if block[0] != None:
        dict_block = block[0].__dict__.copy()
        dict_block['transactions'] = [
            tx.__dict__ for tx in dict_block['transactions']]
        response = {
            'message': 'Block added successfully.',
            'block': dict_block
        }
        return jsonify(response), 201
    else:
        response = {
            'message': 'Adding a block failed.',
            'reason': block[1]
        }
        return jsonify(response), 500


# GET - Get History of Transactions
@app.route('/transactions', methods=['GET'])
def get_open_transaction():
    transactions = blockchain.get_open_transactions()
    dict_transactions = [tx.__dict__ for tx in transactions]
    return jsonify(dict_transactions), 200

# GET - Get a Snapshot of the Current chain
# Json is used in below route as we want to return some data, not render a webpage
@app.route('/chain', methods=['GET'])
def get_chain():
    chain_snapshot = blockchain.chain
    # we use .copy() to prevent side effects of manipulating of the block for future requests
    dict_chain = [block.__dict__.copy() for block in chain_snapshot]
    for dict_block in dict_chain:
        dict_block['transactions'] = [
            tx.__dict__ for tx in dict_block['transactions']]
    return jsonify(dict_chain), 200



# ==================routes to be called from nodejs============================

# GET - Get all records of a patient from blockchain
@app.route('/blockchain/getPatientRecords/<patientid>', methods=['GET'])
def get_records(patientid):
    if patientid == '' or patientid == None:
        response = {
            'message': 'No patient found.'
        }
        return jsonify(response), 400
    records = blockchain.get_records(patientid)
    response = {
            'message': 'records fetched successfully.',
            'records': records
    }
    return jsonify(response), 200

# POST - Make a transaction
@app.route('/blockchain/insertTransaction', methods=['POST'])
def add_transaction():
    if wallet.public_key == None:
        response = {
            'message': 'No wallet set up.'
        }
        return jsonify(response), 400
    values = request.get_json()
    if not values:
        response = {
            'message': 'No data found.'
        }
        return jsonify(response), 400
    required_fields = ['doctor', 'patient', 'data']
    if not all(field in values for field in required_fields):
        response = {
            'message': 'Required data is missing.'
        }
        return jsonify(response), 400
    # sender = values['sender']
    sender = wallet.public_key
    doctor = values['doctor']
    patient = values['patient']
    data = values['data']
    signature = wallet.sign_transaction(sender, doctor, patient, data)
    success = blockchain.add_transaction(
        doctor, patient, wallet.public_key, signature, data)
    if success:
        response = {
            'message': 'Successfully added transaction.',
            'transaction': {
                'sender': sender,
                'doctor': doctor,
                'patient': patient,
                'data': data,
                'signature': signature
            }
        }
        return jsonify(response), 201
    else:
        response = {
            'message': 'Creating a transaction failed.'
        }
        return jsonify(response), 500


# # POST - insert record(transacstion) of a patient in blockchain
# @app.route('/blockchain/insertPatientRecord/<patientid>', methods=['GET'])
# def insert_records(patientid):
    
#     records = blockchain.get_records(patientid)
#     response = {
#             'message': 'records fetched successfully.',
#             'records': records
#     }
#     return jsonify(response), 200

# POST - Add a Peer Node to the Network
@app.route('/node', methods=['POST'])
def add_node():
    values = request.get_json()
    if not values:
        response = {
            'message': 'No data attached.'
        }
        return jsonify(response), 400
    if 'node' not in values:
        response = {
            'message': 'No node data found.'
        }
        return jsonify(response), 400
    node = values['node']
    blockchain.add_peer_node(node)
    response = {
        'message': 'Node added successfully.',
        'all_nodes': blockchain.get_peer_nodes()
    }
    return jsonify(response), 201


# DELETE - Delete a Peer Node
@app.route('/node/<node_url>', methods=['DELETE'])
def remove_node(node_url):
    if node_url == '' or node_url == None:
        response = {
            'message': 'No node found.'
        }
        return jsonify(response), 400
    blockchain.remove_peer_node(node_url)
    response = {
        'message': 'Node removed',
        'all_nodes': blockchain.get_peer_nodes()
    }
    return jsonify(response), 200


# GET - Get List of Peer Nodes
@app.route('/nodes', methods=['GET'])
def get_nodes():
    nodes = blockchain.get_peer_nodes()
    response = {
        'all_nodes': nodes
    }
    return jsonify(response), 200


if __name__ == '__main__':
    from argparse import ArgumentParser
    parser = ArgumentParser()
    # # We add additional arguments which can be used during execution to perform
    # addition funtionality such as create a new port
    parser.add_argument('-p', '--port', type=int, default=5000)
    # Getting a list of arguments using parser
    args = parser.parse_args()
    port = args.port
    wallet = Wallet(port)
    blockchain = Blockchain(wallet.public_key, port)
    app.run(host='localhost', port=port)
