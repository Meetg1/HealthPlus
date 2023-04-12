from Crypto.PublicKey import RSA
from Crypto.Signature import PKCS1_v1_5
from Crypto.Hash import SHA256
import Crypto.Random
import binascii

publicKey = "MIIBCgKCAQEAyZatvMONhoRBY6PI4GMdKnW90GdDGelp4VkQgG2bMjL8dntWe0zCoJHyydvi/UOx3y/UCoi3rtW8vg3awosQbdA1YsjIwZnnxEL3oQ7ilov3n8F+32ZjRQ7WS5qkUOEHgcP5gK+cYbQEwSYDKw4sbf806uWpkw1qy7YChtqJUW4LcBlcOhXykO41CLozXYwP9hoFbEPvSdXluCw3akouFSdW2+Eu7ERtYPoOM7NeGMY8lDRn8MxJaQW3wTS3lIX8WCLzseSV3Av3VDuPoktpmPMSIeSCRqJcR59rAikkxGSyjxbruWFgviQ6MR9C9UAz9bRUAWbbKFZ9VNVP2VCP1QIDAQAB"
privateKey = "MIIEowIBAAKCAQEAyZatvMONhoRBY6PI4GMdKnW90GdDGelp4VkQgG2bMjL8dntWe0zCoJHyydvi/UOx3y/UCoi3rtW8vg3awosQbdA1YsjIwZnnxEL3oQ7ilov3n8F+32ZjRQ7WS5qkUOEHgcP5gK+cYbQEwSYDKw4sbf806uWpkw1qy7YChtqJUW4LcBlcOhXykO41CLozXYwP9hoFbEPvSdXluCw3akouFSdW2+Eu7ERtYPoOM7NeGMY8lDRn8MxJaQW3wTS3lIX8WCLzseSV3Av3VDuPoktpmPMSIeSCRqJcR59rAikkxGSyjxbruWFgviQ6MR9C9UAz9bRUAWbbKFZ9VNVP2VCP1QIDAQABAoIBADK4J4RLy0rh8bXJGpxiM49gSl6p7HcThCE/kGhPq3GI5H5G7+5b1MgjkGt7WHQSWSlnVjlERrrFahSDVdwGsx59+UCedexH9ckqdDVgkmAAXVAjlfFNSIKyhfZFtTvoMkRS826OQJFQgrW6A6gMi98tC7piCDVIdetFIwOc7lm/HOlkYa7wiYDhFnGZ9I2P6DNLS8s065mQuvclc80VQlOunI/dLWRhoboxNZRM1nJbP/x1Cw/UGr8OmYgHgy2W9sDQ9fuPHHfIlfF/mxh/8sdNkqmnRMiwqJsSbE8Hvnz7lKT/ynX0lGdp8K9+Locd+RG0gLkNbT2/GjWGo7S1io0CgYEA584muiBopNAsaunZUFeFipN7uy9pwiY5M1JM8+9ZDtCJYBVYHMI76nWQsaljpK04dQRLhVxvmFsSxd7l3iwmCu8EeT6KBbrCxdxN5gig65vmdIduCUUCLIKskIdb9R30ZecbskuH81jp/Q5m81F9T3WnhgbFWMR1vCrBcAWmmusCgYEA3qEiysmju668/LUgyZG3f/qu0sLbd8swceA43LFvelN125k4dWT/rPsb3JosCPw9nbW+sbkH3euxwnmSgZQPs69EiNGzZkZgIO64klNtjNumAhS2LrulOlC5ay+UYsOsEBkECSIZisUPoqJ3Qkh6pkdrbQd32ZAqt/6by+b1UD8CgYB+knFRBms9OzJVupTfqrqPXVKddhkwWwC2xkSgmduuHC422dC/+0sODd3RNKXlAHSoaIz4J+4Dag9JHhm0A7VOGQ7/SSfCUyURNucOKT39CKaAkIaD5zt1pHCnhlGu+Qk/Lz9PTrDQLoetltSeHavn3F158G6HttZ2xX3UNjGvuwKBgFqvuMRyLsgc/c7S2XBCc0UmkGA6D7xUgH9inscHYCmsJa42U9E+Owfzof3Sr21Zkp/TkMJEZPf5MofNjehKr7q6AmjZQwK+WBoSJA02/sEKGC1w0mVm+n8ustj+oKs6mbRU/FfcFBt6+kt9cqcFbzCclx3qlN+C4mPgywXcrtQwEvlnVkQ7MBK0PgYN/J9rKy6dEuTKJlJ9cs7C6NaPWtC7yRZkeqkk1S9SaE8HA9A1BriqYCQ/GmcetjV95p1kJoVrkBiJCGY0G32Z6bll7xIdAL5t"

def sign_transaction(sender):
        signer = PKCS1_v1_5.new(RSA.importKey(binascii.unhexlify(self.private_key)))
        h = SHA256.new((str(sender) + str(doctor)+ str(patient) + str(data)).encode('utf8'))
        signature = signer.sign(h)
        return binascii.hexlify(signature).decode('ascii')

    
def verify_transaction(transaction):
    public_key = RSA.importKey(binascii.unhexlify(transaction.sender))
    verifier = PKCS1_v1_5.new(public_key)
    h = SHA256.new((str(transaction.sender) + str(transaction.doctor) + str(transaction.patient) + str(transaction.data)).encode('utf8'))
    return verifier.verify(h, binascii.unhexlify(transaction.signature))