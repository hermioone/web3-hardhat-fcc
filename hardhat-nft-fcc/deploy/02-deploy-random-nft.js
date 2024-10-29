const { ethers, network } = require('hardhat');
const { developmentChains, networkConfig } = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');

const VRF_SUB_FUND_AMOUNT = ethers.parseEther('5');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const deployer = (await getNamedAccounts()).deployer;
    const signer = await ethers.getSigner(deployer);
    const chainId = network.config.chainId;

    let vrfCoordinatorV2Addr, subscriptionId;
    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Addr = (await deployments.get('VRFCoordinatorV2_5Mock')).address;
        const vrfCoordinatorV2 = await ethers.getContractAt('VRFCoordinatorV2_5Mock', vrfCoordinatorV2Addr, signer);
        log(`Create subscription in mock...${vrfCoordinatorV2Addr}`);
        const transactionResponse = await vrfCoordinatorV2.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.logs[0].args.subId;
        // 必须要先 fund 才能使用
        log('Fund subscription in mock...');
        await vrfCoordinatorV2.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    }

    log('-----------------------------------');

    const gasLane = networkConfig[chainId]['gasLane'];
    const callbackGasLimit = networkConfig[chainId]['callbackGasLimit'];
    let nativePayment = true;
    if (developmentChains.includes(network.name)) {
        nativePayment = false;
    }
    let tokenUris = [
        'ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo',
        'ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d',
        'ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm',
    ];

    // if (process.env.UPLOAD_TO_PINATA == 'true') {
    //     tokenUris = await handleTokenUris();
    // }

    const args = [vrfCoordinatorV2Addr, gasLane, subscriptionId, callbackGasLimit, nativePayment, tokenUris];
    console.log('args: ', args);
    await deploy('RandomIpfsNft', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockForConfirmations,
    });

    if (!developmentChains.includes(network.name)) {
        log('verify...');
        await verify('RandomIpfsNft', args);
        log('verify finished...');
    }

    if (developmentChains.includes(network.name)) {
        // In latest version of Chainlink/contracts 0.6.1 or after 0.4.1, we need to add consumer explicitly after deployment of contract
        const vrfCoordinatorV2 = await ethers.getContractAt('VRFCoordinatorV2_5Mock', vrfCoordinatorV2Addr);
        const randomNftAddress = (await get('RandomIpfsNft')).address;
        const randomNft = await ethers.getContractAt('RandomIpfsNft', randomNftAddress, signer);
        await vrfCoordinatorV2.addConsumer(subscriptionId, randomNft.target);
    }
};
