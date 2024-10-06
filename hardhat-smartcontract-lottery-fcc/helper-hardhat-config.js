const { ethers } = require('hardhat');

const networkConfig = {
    11155111: {
        name: 'sepolia',
        vrfCoordinatorV2: '0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B',
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        subscriptionId: "62295715254664953345346760506992056354602484623169076835212501353533143796728",
        callbackGasLimit: "500000",  // 500,000 gas
        interval: "30",         // 30s
    },
    31337: {
        name: 'localhost',
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callbackGasLimit: "500000",  // 500,000 gas,
        interval: "30",
    },
};

const developmentChains = ['hardhat', 'localhost'];

module.exports = {
    networkConfig,
    developmentChains,
};
