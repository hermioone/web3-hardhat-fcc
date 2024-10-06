const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');

if (network.name === "sepolia") {
    describe('Raffle Unit Test', () => {
        let raffle, deployer, interval, raffleEntranceFee;
        let raffleAddr;

        beforeEach(async () => {
            await new Promise(async (resolve, reject) => {
                try {
                    deployer = (await getNamedAccounts()).deployer;
                    const signer = await ethers.getSigner(deployer);
                    raffleAddr = (await deployments.get('Raffle')).address;
                    raffle = await ethers.getContractAt('Raffle', raffleAddr, signer);
                    interval = await raffle.getInterval();
                    raffleEntranceFee = await raffle.getEntranceFee();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });

        
        describe('fulfillRandomWords', async () => {
            it('works with live chainlink keepers and chainlink VRF, we get a random winner', async () => {
                const startTimestamp = await raffle.getLatestTimestamp();
                let winnerStartBalance;
                console.log(`winner is: ${deployer}`);

                await new Promise(async (resolve, reject) => {
                    raffle.once('WinnerPicked', async () => {
                        console.log('Winner has been picked!!!!!!');
                        try {
                            const recentWinner = await raffle.getRecentWinner();
                            console.log(`winner is: ${recentWinner}`);
                            const winnerEndingBalance = await ethers.provider.getBalance(recentWinner);
                            const state = await raffle.getRaffleState();
                            const endTimestamp = await raffle.getLatestTimestamp();
                            const numPlayers = await raffle.getNumberOfPlayers();

                            assert.equal(numPlayers.toString(), "0");
                            assert.equal(state.toString(), "0");
                            assert.isTrue(endTimestamp > startTimestamp);
                            assert.equal(recentWinner.toString(), deployer.toString());
                            
                            console.log(`raffleEntranceFee: ${raffleEntranceFee}`);
                            console.log(`winnerEndingBalance: ${winnerEndingBalance}`);
                            console.log(`winnerStartBalance: ${winnerStartBalance}`);
                            assert.equal(winnerEndingBalance, winnerStartBalance + raffleEntranceFee);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    });

                    const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
                    await tx.wait(1);
                    winnerStartBalance = await ethers.provider.getBalance(deployer);
                    console.log("Start on listening...");
                });
            });
        });
    });
}
