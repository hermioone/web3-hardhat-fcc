// const hre = require("hardhat")
// const getNamedAccounts = hre.getNamedAccounts;
// const deployments = hre.deployments;

const { network, ethers } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');

const BASE_FEE = ethers.parseEther('0.25'); // 每个 request 花费 0.25 LINK
const GAS_PRICE_LINK = 1e9; // link per gas
const WEI_PER_UNIT_LINK = ethers.parseEther('1');       // LINK / ETH

module.exports = async ({ getNamedAccounts, deployments }) => {
    const deploy = deployments.deploy;
    const log = deployments.log;
    const deployer = (await getNamedAccounts()).deployer;
    log(network);

    const args = [BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK];
    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        log('******************************** Deploying mocks ********************************');
        await deploy('VRFCoordinatorV2_5Mock', {
            from: deployer,
            args: args,
            log: true,
            waitConfirmations: 1,
        });
        log('******************************** Deploy finished ********************************');
    }
};

module.exports.tags = ['all'];
