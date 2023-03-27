from collections import OrderedDict

from utility.printable import Printable

# Transaction class represents an open transaction which can be added to a block to become processed transaction
class Transaction(Printable):
    def __init__(self, sender, doctor, patient, signature, data):
        self.sender = sender
        self.doctor = doctor
        self.patient = patient
        self.data = data
        self.signature = signature

    # Converts the transaction into a hashable OrderedDict
    def to_ordered_dict(self):
        return OrderedDict([('sender', self.sender), ('doctor', self.doctor), ('patient', self.patient), ('data', self.data)])
