const { hardhat, ethers, network } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments;
    const deployer = (await getNamedAccounts()).deployer;

    const args = [];
    const basicNft = await deploy('BasicNft', {
        from: deployer,
        args: args,
        waitConfirmations: network.config.blockConfirmations,
    });
    if (!developmentChains.includes(network.name)) {
        log('verify BasicNft...');
        await verify('BasicNft', args);
        log('verify BasicNft finished...');
    }
};

module.exports.tags = ["ut"];
