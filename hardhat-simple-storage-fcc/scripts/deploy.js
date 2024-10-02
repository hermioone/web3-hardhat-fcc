const { ethers, run, network } = require("hardhat");

async function main() {
    // hardhat 知道 contracts 目录，所以可以直接找到编译后的 SimpleStorage
    // SimpleStorage.sol 中的 contract 也必须为 SimpleStorage 才可以
    const simpleStorageFactory = await ethers.getContractFactory("SimpleStorage");
    const simpleStorage = await simpleStorageFactory.deploy();
    await simpleStorage.deployed();
    console.log(`Contract: ${simpleStorage.address}`);
    console.log(network.config);
    if (network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
        // 这个合约被部署到 Sepolia 中
        // 先等待 6 个区块
        console.log("Start to wait for 6 blocks...");
        await simpleStorage.deployTransaction.wait(6);
        console.log("Start to vefify...");
        await verify(simpleStorage.address, []);
        console.log("Successfully verified...");
    }

    let currentValue = await simpleStorage.retrive();
    console.log(`Current value is: ${currentValue}`);
    const transactionResponse = await simpleStorage.store(8);
    await transactionResponse.wait(1);
    currentValue = await simpleStorage.retrive();
    console.log(`Current value is: ${currentValue}`);
}

async function verify(contractAddr, args) {
    console.log("Verifying contract.");
    try {
        await run("verify:verify", {
            address: contractAddr,
            constructorArguments: args,
        });
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified...");
        } else {
            console.log(e);
        }
    }
    
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.log(err);
        process.exit(-1);
    });
