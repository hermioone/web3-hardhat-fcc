require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
// require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-verify");
require("./tasks/block-number");
require("hardhat-gas-reporter");
require("solidity-coverage")

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
/* 
// 去掉注释后，执行 yarn hardhat，就可以看到 tasks 中有一个叫做 "accounts" 的task
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
}); 
*/

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// 如果 process.env.SEPOLIA_PRC_URL 不存在，则 SEPOLIA_PRC_URL 为 ""
const SEPOLIA_PRC_URL = process.env.SEPOLIA_PRC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

module.exports = {
    solidity: "0.8.8",
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    defaultNetwork: "hardhat",
    networks: {
        sepolia: {
            url: SEPOLIA_PRC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
        },
        //  可以通过 yarn hardhat node 启动一个本地的 network，然后可以使用 local 来连接本地的 network
        local: {
            url: "http:127.0.0.1:8545",
            chainId: 31337,
        },
    },
	gasReporter: {
		enabled: true,
		// outputFile: "resports/gas-report.txt",
	}
};
