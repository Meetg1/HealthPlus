# Importing
from functools import reduce
import hashlib as hl

import json
import pickle
import requests

from utility.hash_util import hash_block
from utility.verification import Verification
from block import Block
from transaction import Transaction
from wallet import Wallet


#__name__ is basically used here to identify whether the file is executed as main program or
# if it is being imported from another module/file and then being executed
print(__name__)

# This class manages the chain of blocks, open transactions and the node on which it's running
#    chain: The list of blocks
#    open_transactions (private): The list of open transactions
#    hosting_node: The connected node (which runs the blockchain)
class Blockchain:
    def __init__(self, public_key, node_id):
        # Genesis block is the very first block in our blockchain
        genesis_block = Block(0, '', [], 100, 'None', 0)
        genesis_block.hash = hash_block(genesis_block)
        # Initializing our blockchain list
        self.chain = [genesis_block]
        # Unhandled or Open transactions which are yet to be included in a block
        self.__open_transactions = []
        self.public_key = public_key
        self.__peer_nodes = set()
        self.node_id = node_id
        self.resolve_conflicts = False
        self.load_data()

    # This turns the chain attribute into a property with a getter (the method below) and a setter (@chain.setter)
    # chain[:] returns a copy so we only get a copy of the reference of the objects, so we can't directly change the value
    @property
    def chain(self):
        return self.__chain[:]

    # The setter for the chain property
    @chain.setter
    def chain(self, val):
        self.__chain = val

    # Returns a copy of the open transactions list that are yet to be mined
    def get_open_transactions(self):
        return self.__open_transactions[:]

    # Initialize blockchain + open transactions data from a file
    def load_data(self):
        try:
            with open('./HealthPlus_Blockchain/blockchain-{}.txt'.format(self.node_id), mode='r') as f:
                # file_content = pickle.loads(f.read())
                file_content = f.readlines()
                # blockchain = file_content['chain']
                # open_transactions = file_content['ot']
                blockchain = json.loads(file_content[0][:-1])
                # We need to convert the loaded data because Transactions should use OrderedDict
                updated_blockchain = []
                for block in blockchain:
                    converted_tx = [Transaction(
                        tx['sender'], tx['doctor'], tx['patient'], tx['signature'], tx['data']) for tx in block['transactions']]
                    updated_block = Block(
                        block['index'], block['previous_hash'], converted_tx, block['proof'], block['mined_by'], block['timestamp'], block['hash'] )
                    updated_blockchain.append(updated_block)
                self.chain = updated_blockchain
                open_transactions = json.loads(file_content[1][:-1])
                # We need to convert the loaded data because Transactions should use OrderedDict
                updated_transactions = []
                for tx in open_transactions:
                    updated_transaction = Transaction(
                        tx['sender'], tx['doctor'], tx['patient'], tx['signature'], tx['data'])
                    updated_transactions.append(updated_transaction)
                self.__open_transactions = updated_transactions
                peer_nodes = json.loads(file_content[2])
                self.__peer_nodes = set(peer_nodes)
        except (IOError, IndexError):
            pass
        finally:
            print('Cleanup!')

    # Save blockchain + open transactions to a file
    def save_data(self):
        try:
            with open('./HealthPlus_Blockchain/blockchain-{}.txt'.format(self.node_id), mode='w') as f:
                saveable_chain = [block.__dict__ for block in [Block(block_el.index, block_el.previous_hash, [
                    tx.__dict__ for tx in block_el.transactions], block_el.proof, block_el.mined_by, block_el.timestamp, block_el.hash) for block_el in self.__chain]]
                f.write(json.dumps(saveable_chain))
                f.write('\n')
                saveable_tx = [tx.__dict__ for tx in self.__open_transactions]
                f.write(json.dumps(saveable_tx))
                f.write('\n')
                f.write(json.dumps(list(self.__peer_nodes)))
                # save_data = {
                #     'chain': blockchain,
                #     'ot': open_transactions
                # }
                # f.write(pickle.dumps(save_data))
        except IOError:
            print('Saving failed!')

    # Generate a proof of work for open transactions, hash of previous block and a random number(Which is guessed until it fits)
    def proof_of_work(self):
        last_block = self.__chain[-1]
        last_hash = last_block.hash
        proof = 0
        # Try different PoW numbers and return the first valid one
        transactions = [tx.to_ordered_dict() for tx in self.__open_transactions]
        while not Verification.valid_proof(transactions, last_hash, proof)[1]:
            proof += 1
        return [Verification.valid_proof(transactions, last_hash, proof)[0], proof]

    # fetch all records of a patient
    def get_records(self, patientid):
        
        # records = [] [[tx.__dict__.copy() for tx in block.transactions
        #               if tx.patient == patientid] for block in self.__chain]   
        records = []
        for block in self.__chain:
            for tx in block.transactions:
                if tx.patient == patientid:
                    temp = tx.__dict__.copy()
                    temp['isSignatureValid'] = Wallet.verify_transaction(tx)
                    records.append(temp)

        # print(records)
        return records

        # records = [[tx for tx in block.transactions
        #               if tx.patient == patientid] for block in self.__chain]       
        

    # Returns the last value of the current blockchain
    def get_last_blockchain_value(self):
        if len(self.__chain) < 1:
            return None
        return self.__chain[-1]

    # Creating a Chain of Data( Append a new value as well as the last blockchain value to the blockchain )
    def add_transaction(self, doctor, patient, sender, signature, data=1.0, is_receiving=False):
        # transaction = {
        #     'sender': sender,
        #     'patient': patient,
        #     'amount': amount
        # }
        # if self.public_key == None:
        #     return False
        transaction = Transaction(sender, doctor, patient, signature, data)
        if Verification.verify_transaction(transaction):
            self.__open_transactions.append(transaction)
            self.save_data()            
            if not is_receiving:
                for node in self.__peer_nodes:
                    url = 'http://{}/broadcast-transaction'.format(node)
                    try:
                        response = requests.post(url, json={
                                                 'sender': sender, 'doctor':doctor, 'patient': patient, 'data': data, 'signature': signature})
                        if response.status_code == 400 or response.status_code == 500:
                            print('Transaction declined, needs resolving')
                            return False
                    except requests.exceptions.ConnectionError:
                        continue

                # MINE THE BLOCK IF MORE THAN 2 TRANSACTIONS HAVE BEEN ACCUMULATED
                if len(self.__open_transactions)>=2:
                    print('omm')
                    print(self.node_id)
                    url = 'http://localhost:{}/mine'.format(self.node_id)
                    requests.post(url)
            return True
        return False

    # Mine a new block in the Blockchain ( Create a new block and add open transactions to it )
    def mine_block(self):
        if self.public_key == None:
            return [None, 'wallet not set up']
        if len(self.__open_transactions) <= 0:
            return [None, 'No open transactions found!']
        last_block = self.__chain[-1]
        # Hash the last block. So, we can compare it to the stored hash value
        prev_block_hash = last_block.hash
        temp = self.proof_of_work()
        powHash = temp[0]
        proof = temp[1]
        mined_by = self.node_id

        copied_transactions = self.__open_transactions[:]
        for tx in copied_transactions:
            if not Wallet.verify_transaction(tx):
                return [None, 'invalid transaction found in block!']
        block = Block(index = len(self.__chain), previous_hash = prev_block_hash, transactions = copied_transactions, proof = proof, mined_by = mined_by, hashh = powHash)
        self.__chain.append(block)
        self.__open_transactions = []
        self.save_data()
        for node in self.__peer_nodes:
            url = 'http://{}/broadcast-block'.format(node)
            converted_block = block.__dict__.copy()
            
            converted_block['transactions'] = [
                tx.__dict__ for tx in converted_block['transactions']]
            try:
                response = requests.post(url, json={'block': converted_block})
                print(response)
                if response.status_code == 400 or response.status_code == 500:
                    print('Block declined, needs resolving')
                if response.status_code == 409:
                    self.resolve_conflicts = True
            except requests.exceptions.ConnectionError:
                # continue to next node
                continue
        return [block,'']
    
    def resolve(self):
        # we use the longest chain to achieve consensus
        winner_chain = self.get_chain()
        replace = False
        for node in self.__peer_nodes:
            url = 'http://{}:{}/chain'.format(
                self.hostname, node)
            try:
                response = requests.get(url)
                node_chain = response.json()
                node_chain = [Block(
                    block['index'],
                    block['previous_hash'],
                    [Transaction(
                        tx['sender'],
                        tx['receiver'],
                        tx['signature'],
                        tx['details'],
                        tx['timestamp'],
                        ) for tx in block['transactions']],
                    block['proof'],
                    block['timestamp'],
                ) for block in node_chain]
                node_chain_length = len(node_chain)
                local_chain_length = len(winner_chain)
                if node_chain_length > local_chain_length and Verification.verify_chain(node_chain):
                    winner_chain = node_chain
                    replace = True
            except requests.exceptions.ConnectionError:
                # continue to next node
                continue

        self.resolve_conflicts = False
        self.__chain = winner_chain
        if replace:
            self.__open_transactions = []
        self.save_data()
        return 

    def add_block(self, block):
        transactions = [Transaction(
            tx['sender'], tx['doctor'], tx['patient'], tx['signature'], tx['data']) for tx in block['transactions']]
        ordered_transactions = [tx.to_ordered_dict() for tx in transactions]
        proof_is_valid = Verification.valid_proof(
            ordered_transactions, block['previous_hash'], block['proof'])[1]
        hashes_match = self.chain[-1].hash == block['previous_hash']
        if not proof_is_valid or not hashes_match:
            print(proof_is_valid)
            print(hashes_match)
            return False
        converted_block = Block(index = block['index'], previous_hash = block['previous_hash'], transactions = transactions, proof = block['proof'], mined_by = block['mined_by'], hashh = block['hash'],timestamp = block['timestamp'])
        self.__chain.append(converted_block)
        stored_transactions = self.__open_transactions[:]
        for itx in block['transactions']:
            for opentx in stored_transactions:
                if opentx.sender == itx['sender'] and opentx.patient == itx['patient'] and opentx.data == itx['data'] and opentx.signature == itx['signature']:
                    try:
                        self.__open_transactions.remove(opentx)
                    except ValueError:
                        print('Item was already removed')
        self.save_data()
        return True

    # add a new node to the network of peer nodes
    # node: The node URL which should be added
    def add_peer_node(self, node):
        self.__peer_nodes.add(node)
        self.save_data()

    # remove a new node to the network of peer nodes
    # node: The node URL which should be removed
    def remove_peer_node(self, node):
        self.__peer_nodes.discard(node)
        self.save_data()

    def get_peer_nodes(self):
        return list(self.__peer_nodes)
