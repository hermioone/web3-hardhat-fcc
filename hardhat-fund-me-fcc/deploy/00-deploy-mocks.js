const { network } = require('hardhat');
const { developmentChains, DECIMALS, INITIAL_ANSWER } = require('../helper-hardhat-config');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)) {
        log('Local network detected! Start to deploy mocks...');
        await deploy('MockV3Aggregator', {
            contract: 'MockV3Aggregator',
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_ANSWER],
        });
        log("*********** MockV3Aggregator has been deployed ***********")
    }
};

// 运行时通过 yarn hardhat deploy --tags mocks 来指定运行 deploy 目录下的哪些脚本
module.exports.tags = ["all", "mocks"];
