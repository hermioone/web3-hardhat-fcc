const {ethers, run, network} = require("hardhat");

async function main() {
    const fundMeFactory = await ethers.getContractFactory("FundMe");
    // 这个操作做完并不保证交易一定被写到区块链上了
    const fundMe = await fundMeFactory.deploy();
    await fundMe.waitForDeployment();
    console.log(`FundMe has been deployed: ${fundMe.target}`);

    // 防止合约已经被写到区块链中，但是 EtherScan 还没有成功把这个区块写到自己本地的数据库中，这个时候调用 verify 有可能 EtherScan 会认为是个空合约
    // 所以这里等6个区块，过了6个区块后，EtherScan 大概率已经写到本地数据库了。

    if (network.config.chainId === 11155111 && process.env.ETHERSCAN_API_KEY) {
        console.log("Waiting for 6 blocks...")
        await fundMe.deploymentTransaction().wait(6);
        try {
            console.log("Start to verify...")
            await run("verify:verify", {
                address: fundMe.target,
                constructorArguments: [],
            });
        } catch (e) {
            if (e.message.toLowerCase().includes("already verified")) {
                console.log("Already verified...");
            } else {
                console.log(e);
            }
        }
        console.log("FundMe has been verified.");
    }
}

main()
    .then()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
