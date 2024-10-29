const { ethers, network } = require('hardhat');
const { verify } = require('../utils/verify');
const { developmentChains } = require("../helper-hardhat-config");
const fs = require("fs");

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments;

    const deployer = (await getNamedAccounts()).deployer;
    const lowSvg = await fs.readFileSync("./images/frown.svg", {encoding: "utf8"});
    const highSvg = await fs.readFileSync("./images/happy.svg", {encoding: "utf8"});

    const args = [lowSvg, highSvg];
    const nft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name)) {
        log('start to verify...');
        await verify(nft.address, args);
        log('verify finished...');
    }
};

module.exports.tags = ["svg"];
