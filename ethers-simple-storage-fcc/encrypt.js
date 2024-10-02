const ethers = require("ethers");
const fs = require("fs-extra");
const { exit } = require("process");

require("dotenv").config();

async function main() {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const encryptedJsonKey = await wallet.encrypt(process.env.ENCRYPT_PASSWORD);
    console.log(encryptedJsonKey);
    fs.writeFileSync("./.encryptedKey.json", encryptedJsonKey);
}

main()
    .then(() => exit(0))
    .catch((err) => {
        console.log(err);
        exit(-1);
    });
