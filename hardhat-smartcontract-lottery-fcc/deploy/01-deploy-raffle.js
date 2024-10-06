const { network, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

const VRF_SUB_FUND_AMOUNT = ethers.parseEther('5');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const signer = await ethers.getSigner(deployer);
    const chainId = network.config.chainId;

    let vrfCoordinatorV2Addr, subscriptionId;
    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Addr = (await deployments.get('VRFCoordinatorV2_5Mock')).address;
        const vrfCoordinatorV2 = await ethers.getContractAt('VRFCoordinatorV2_5Mock', vrfCoordinatorV2Addr, signer);
        deployments.log('Create subscription in mock...');
        const transactionResponse = await vrfCoordinatorV2.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.logs[0].args.subId;
        // 必须要先 fund 才能使用
        deployments.log('Fund subscription in mock...');
        await vrfCoordinatorV2.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Addr = networkConfig[chainId]['vrfCoordinatorV2'];
        subscriptionId = networkConfig[chainId]['subscriptionId'];
        // 在 sepolia 中也可以像上面本地测试时使用代码来订阅和 fund，也可以在 chainlink 页面中订阅和 fund
    }
    const entranceFee = networkConfig[chainId]['entranceFee'];
    const gasLane = networkConfig[chainId]['gasLane'];
    const callbackGasLimit = networkConfig[chainId]['callbackGasLimit'];
    const interval = networkConfig[chainId]['interval'];
    let nativePayment = true;
    if (developmentChains.includes(network.name)) {
        nativePayment = false;
    }
    
    const args = [vrfCoordinatorV2Addr, entranceFee, gasLane, subscriptionId, callbackGasLimit, interval, nativePayment];
    const raffle = await deployments.deploy('Raffle', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    if (developmentChains.includes(network.name)) {
        // In latest version of Chainlink/contracts 0.6.1 or after 0.4.1, we need to add consumer explicitly after deployment of contract
        const vrfCoordinatorV2 = await ethers.getContractAt('VRFCoordinatorV2_5Mock', vrfCoordinatorV2Addr);
        await vrfCoordinatorV2.addConsumer(subscriptionId, raffle.address);
        deployments.log(`raffle.address is ${raffle.address}`);
        deployments.log(`raffle.target is ${raffle.target}`);
        deployments.log(`vrfCoordinatorV2.address is ${vrfCoordinatorV2.address}`);
        deployments.log(`vrfCoordinatorV2.target is ${vrfCoordinatorV2.target}`);
        deployments.log(`vrfCoordinatorV2.target is ${await vrfCoordinatorV2.getAddress()}`);
        deployments.log('Consumer is added');
    }
    if (!developmentChains.includes(network.name)) {
        deployments.log(`Start to verify in ${network.name}...`);
        await verify(raffle.address, args);
    }
    deployments.log('-------------------------------------- Finished --------------------------------------');
};

module.exports.tags = ['all', 'raffle'];
