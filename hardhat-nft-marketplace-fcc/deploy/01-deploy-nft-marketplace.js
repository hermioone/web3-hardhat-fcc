const { ethers, network } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

module.exports = async ({ deployments, getNamedAccounts }) => {
    const deploy = deployments.deploy;
    const log = deployments.log;
    const deployer = (await getNamedAccounts()).deployer;

    const args = [];
    await deploy('NftMarketplace', {
        from: deployer,
        args: args,
        waitConfirmations: network.config.blockConfirmations,
    });
    if (!developmentChains.includes(network.name)) {
        log('verify...');
        await verify('NftMarketplace', args);
        log('verify finished...');
    }
};

module.exports.tags = ["sepolia", "ut"];
