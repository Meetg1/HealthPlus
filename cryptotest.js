// publicKey = "30819f300d06092a864886f70d010101050003818d0030818902818100be835b6b855fc868fbbdb0a8cbbece92c48b7f51f1f24bd118eaffe9b9dd8afd3b280c1a45f4e784af8aa8311ed30522b2bf818c744be5a62312494c5c39c11bc16d09aa95d692e545e7836ed13ee901c0c834a6178375f4f95c404d292c6e01aaeb533697ca47db262d446704b1163bc863da5487b8a6fd36c45e25d2686db90203010001";
// privateKey = "3082025c02010002818100be835b6b855fc868fbbdb0a8cbbece92c48b7f51f1f24bd118eaffe9b9dd8afd3b280c1a45f4e784af8aa8311ed30522b2bf818c744be5a62312494c5c39c11bc16d09aa95d692e545e7836ed13ee901c0c834a6178375f4f95c404d292c6e01aaeb533697ca47db262d446704b1163bc863da5487b8a6fd36c45e25d2686db902030100010281805731b1a6cd5d6051445eb63b1b3d52387442505c85fada5e7224244aa9e9ced245bff78212e09b11ec71eeb6c49fda2ade5aae0545b8f2fb8df3b19e845b5e98f60f6f00baf984095cd19b2c5e30118ba872bab6d1b372cbb34643be586e5894274465cb1e5ff67d4e67367b9ac288eabee21632a58ebbe0b531937bc84da30d024100d2140c0154f1320d5a6b68160e714225d51a119d090f13ead238145e9854404a31052de73afac30ac51c1c6d446d1a6260ceca560f2bef2c3071292c73e0ebf3024100e82871d388ed60115c293115c0625f47c86da9f71656a4c58a98dbcf99a7aabcf2c1466ba3021f5e19863617f8750b5890ce7bceada880e43e8ee04c37cb86a3024001f97e4364f0ff6f70b221c053526d34bdd408e658f7735079b95d37a666e453ce3226444e219d43b4a696fdcfeed698a6204b76939dee19943afc1016e6be5102400d04af9558194f88c9ad39a6699a5a9370e6cd6020ad8d21d2aacdb0af821a6dec02f08afaa214d6370232a8577360c67fa0448b0b6be6866607a7063f1eb7970241009a7f9f4f303edc9a78cadf8fc54bb258e6c4cc950196b44e56e8d42976095b67054e103f19d7173a851dd95444e3a526676d7570e69911961dcd52e60978b967"

const crypto = require("crypto")

// The `generateKeyPairSync` method accepts two arguments:
// 1. The type ok keys we want, which in this case is "rsa"
// 2. An object with the properties of the key
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    // The standard secure default length for RSA keys is 2048 bits
    modulusLength: 2048,
})

console.log(
    publicKey.export({
        type: "pkcs1",
        format: "pem",
    }),

    privateKey.export({
        type: "pkcs1",
        format: "pem",
    })
)

// This is the data we want to encrypt
const data = "my secret data"

const encryptedData = crypto.publicEncrypt(
    {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
    },
    // We convert the data string to a buffer using `Buffer.from`
    Buffer.from(data)
)

// The encrypted data is in the form of bytes, so we print it in base64 format
// so that it's displayed in a more readable form
console.log("encypted data: ", encryptedData.toString("base64"))

const decryptedData = crypto.privateDecrypt(
    {
        key: privateKey,
        // In order to decrypt the data, we need to specify the
        // same hashing function and padding scheme that we used to
        // encrypt the data in the previous step
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
    },
    encryptedData
)

// The decrypted data is of the Buffer type, which we can convert to a
// string to reveal the original data
console.log("decrypted data: ", decryptedData.toString())

// Create some sample data that we want to sign
const verifiableData = "this need to be verified"

// The signature method takes the data we want to sign, the
// hashing algorithm, and the padding scheme, and generates
// a signature in the form of bytes
const signature = crypto.sign("sha256", Buffer.from(verifiableData), {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
})

console.log(signature.toString("base64"))

// To verify the data, we provide the same hashing algorithm and
// padding scheme we provided to generate the signature, along
// with the signature itself, the data that we want to
// verify against the signature, and the public key
const isVerified = crypto.verify(
    "sha256",
    Buffer.from(verifiableData),
    {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    },
    signature
)

// isVerified should be `true` if the signature is valid
console.log("signature verified: ", isVerified)