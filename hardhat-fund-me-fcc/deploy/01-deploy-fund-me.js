/*
// 等价于下面的用法
module.exports = async (hre) => {
    const { getNameAccounts, deployments } = hre;
}*/

const { networkConfig, developmentChains } = require('../helper-hardhat-config');
const { network } = require('hardhat');
const { verify } = require('../utils/verify');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // 如果 chainId 是 X，那么就使用地址 a；如果 chainId 是 Y，那么就使用地址 b
    let ethUsdPriceFeedAddress;
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await get('MockV3Aggregator');
        ethUsdPriceFeedAddress = ethUsdAggregator.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]['ethUsdPriceFeed'];
    }

    const args = [ethUsdPriceFeedAddress];
    // 当使用本地主机时，我们要使用 mock
    const fundMe = await deploy('FundMe', {
        from: deployer,
        args: args, // 在这里设置不同链的不同 FeedData 的 address，比如 sepolia 的是 0x694AA1769357215DE4FAC081bf1f309aDC325306
        log: true,
        confirmations: 6,   // 等待多少个区块确认
    });
    log('*********** FundMe has been deployed ***********');

    if (!developmentChains.includes(network.name)) {
        await verify(fundMe.address, args);
    }
};

module.exports.tags = ['all'];
