const {task} = require("hardhat/config")

task("block-number", "print the current block number").setAction(
    async (taskArgs, hre) => {
        // hre 是 HardhatRuntimeEnvironment
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        console.log(`Current block number: ${blockNumber}`);
    }
)