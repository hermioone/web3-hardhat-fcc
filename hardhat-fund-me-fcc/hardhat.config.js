require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();
require('@nomicfoundation/hardhat-verify');
require('hardhat-deploy');
require('hardhat-gas-reporter');

const SEPOLIA_PRC_URL = process.env.SEPOLIA_PRC_URL || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

module.exports = {
    // defaultNetwork: "hardhat", 默认网络就是 hardhat，所以可以不用写
    solidity: {
        // 让 hardhat 支持编译多个 solidity 版本
        compilers: [{ version: '0.8.24' }, { version: '0.8.0' }],
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    networks: {
        sepolia: {
            url: SEPOLIA_PRC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
        },
        localhost: {
            url: 'http:127.0.0.1:8545',
            chainId: 31337,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
        },
    },
    gasReporter: {
        enabled: true,
        // outputFile: "resports/gas-report.txt",
    }
};
