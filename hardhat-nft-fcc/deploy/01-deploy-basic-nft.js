const { ethers, network } = require('hardhat');
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require('../utils/verify');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const deployer = (await getNamedAccounts()).deployer;

    log('-----------------------------------');
    const args = [];
    await deploy('BasicNft', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockForConfirmations,
    });

    if(!developmentChains.includes(network.name)) {
        log("verify...");
        await verify("BasicNft", args);
        log("verify finished...");
    }
};
