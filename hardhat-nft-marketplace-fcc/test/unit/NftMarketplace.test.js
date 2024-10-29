const { assert } = require('chai');
const { ethers, deployments, getNamedAccounts } = require('hardhat');

describe('Nft Marketplace Tests', () => {
    let nftMarketplace, basicNft, deployer, signer;
    let basicNftAddress, nftMarketplaceAddress;
    let player;
    const PRICE = ethers.parseEther('0.1');
    let TOKEN_ID;

    beforeEach(async () => {
        await deployments.fixture(['ut']);
        deployer = (await getNamedAccounts()).deployer;
        console.log('deployer: ', deployer);
        player = (await ethers.getSigners())[1];
        console.log('player: ', player.address);
        signer = await ethers.getSigner(deployer);
        basicNftAddress = (await deployments.get('BasicNft')).address;
        basicNft = await ethers.getContractAt('BasicNft', basicNftAddress, signer);
        nftMarketplaceAddress = (await deployments.get('NftMarketplace')).address;
        nftMarketplace = await ethers.getContractAt('NftMarketplace', nftMarketplaceAddress, signer);

        const mintResponse = await basicNft.mintNft();
        const mintReceipt = await mintResponse.wait(1);
        TOKEN_ID = mintReceipt.logs[1].args.tId;
        await basicNft.approve(nftMarketplace.target, TOKEN_ID);
    });
    it('a', async () => {
        await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE);
        const playerNftMarketPlace = await ethers.getContractAt('NftMarketplace', nftMarketplaceAddress, player);
        // {value: PRICE} 必须作为最后一个参数传入
        await playerNftMarketPlace.buyItem(basicNft.target, TOKEN_ID, {value: PRICE});
        const newOwner = await basicNft.ownerOf(TOKEN_ID);
        const deployerProceeds = await nftMarketplace.getProceeds();
        assert.equal(player.address, newOwner);
        assert.equal(PRICE, deployerProceeds);
    });
});
