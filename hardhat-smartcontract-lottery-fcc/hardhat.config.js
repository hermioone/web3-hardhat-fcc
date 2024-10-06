require('@nomicfoundation/hardhat-toolbox');
require('hardhat-deploy');
require('@nomicfoundation/hardhat-verify');
require('solidity-coverage');
require('dotenv').config();
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require("@nomicfoundation/hardhat-ethers");

const SEPOLIA_PRC_URL = process.env.SEPOLIA_PRC_URL || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        // 让 hardhat 支持编译多个 solidity 版本
        compilers: [{ version: '0.8.7' }, { version: '0.8.0' }, { version: '0.8.19' }, { version: '0.8.10' }],
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        sepolia: {
            url: SEPOLIA_PRC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            blockConfirmations: 6,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 2000000, // 2000s
    },
    gasReporter: {
        enabled: true,
        // outputFile: "resports/gas-report.txt",
    }
};
