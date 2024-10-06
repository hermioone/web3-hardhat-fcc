const { network, getNamedAccounts, deployments, ethers } = require('hardhat');
const { developmentChains, networkConfig } = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');

if (developmentChains.includes(network.name)) {
    describe('Raffle Unit Test', () => {
        let raffle, vrfCoordinatorV2Mock, deployer, interval, raffleEntranceFee;
        const chainId = network.config.chainId;
        let accounts, raffleAddr;

        beforeEach(async () => {
            try {
                deployer = (await getNamedAccounts()).deployer;
                const signer = await ethers.getSigner(deployer);
                await deployments.fixture('all');
                raffleAddr = (await deployments.get('Raffle')).address;
                const vrfCoordinatorV2MockAddr = (await deployments.get('VRFCoordinatorV2_5Mock')).address;
                raffle = await ethers.getContractAt('Raffle', raffleAddr);
                vrfCoordinatorV2Mock = await ethers.getContractAt('VRFCoordinatorV2_5Mock', vrfCoordinatorV2MockAddr, signer);
                interval = await raffle.getInterval();
                raffleEntranceFee = await raffle.getEntranceFee();
                accounts = await ethers.getSigners();
            } catch (err) {
                console.dir(err);
            }
            
        });

        describe('constructor', () => {
            it('initialize the raffle correctly', async () => {
                const raffleState = await raffle.getRaffleState();
                assert.equal(raffleState.toString(), '0');
            });
        });

        describe('enterRaffle', () => {
            it("reverts when you don't pay enough", async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee - BigInt(1) })).to.be.revertedWithCustomError(raffle, 'Raffle_NotEnoughEth');
            });
            it('records players when they enter', async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const playerFromContract = await raffle.getPlayer(0);
                assert.equal(playerFromContract, deployer);
            });
            it('emits event on enter', async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, 'RaffleEnter');
            });
            it('not allow entrance when raffle is pending', async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send('evm_increaseTime', [Number(interval) + 1]);
                await network.provider.send('evm_mine', []); // 向前挖了一个区块
                await raffle.performUpkeep('0x');
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWithCustomError(raffle, 'Raffle_NotOpen');
            });
        });

        describe('checkUpKeep', () => {
            it('returns false if no ETH in balance', async () => {
                await network.provider.send('evm_increaseTime', [Number(interval) + 1]);
                await network.provider.send('evm_mine', []);
                // callStatic 可以模拟 transaction 而不是真的发送 transaction，如果调用成功的话就返回 true，否则报错并返回失败原因
                // callStatic 可以节省发送真实 transaction 时所花费的 gas
                // metamask 中有的时候在确认一笔 transaction 也会提示你这个 transaction 可能会失败，和这个一样的原理
                // 底层都是使用的以太坊节点的 `eth_call()` 方法，让用户模拟一笔教育
                const { upkeepNeeded, _ } = await raffle.checkUpkeep.staticCall('0x');
                assert.isFalse(upkeepNeeded);
            });
            it("returns false if raffle isn't open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send('evm_increaseTime', [Number(interval) + 1]);
                await network.provider.send('evm_mine', []);
                await raffle.performUpkeep('0x');

                const raffleState = await raffle.getRaffleState();
                const { upkeepNeeded, _ } = await raffle.checkUpkeep.staticCall('0x');
                assert.equal(raffleState.toString(), '1');
                assert.isFalse(upkeepNeeded);
            });
            it("returns false if enough time hasn't passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send('evm_increaseTime', [Number(interval) - 2]);
                await network.provider.send('evm_mine', []);
                const { upkeepNeeded, _ } = await raffle.checkUpkeep.staticCall('0x');
                assert.isFalse(upkeepNeeded);
            });
            it('returns true if enough time has passed, has players, eth, and is open', async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send('evm_increaseTime', [Number(interval)]);
                await network.provider.send('evm_mine', []);
                const { upkeepNeeded, _ } = await raffle.checkUpkeep.staticCall('0x');
                assert.isTrue(upkeepNeeded);
            });
        });
        describe('performUpKeep', () => {
            it('it can only run if checkupKeep is true', async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send('evm_increaseTime', [Number(interval)]);
                await network.provider.send('evm_mine', []);
                const transactionResponse = await raffle.performUpkeep('0x');
                // console.log(transactionResponse);
                const txReceipt = await transactionResponse.wait(1);
                // 因为在 VRFCoordinatorV2_5Mock 的 requestRandomWords() 方法中也会 emit 一个事件
                // 所以我们在 performUpkeep 中 emit 的 event 应该是第2个
                const requestId = txReceipt.logs[1].args.requestId;
                console.log(`requestId: ${requestId}`);
                const raffleState = await raffle.getRaffleState();
                assert.isTrue(Number(requestId) > 0);
                assert.equal(raffleState.toString(), '1');
            });
            it('reverts when checkupKeep is false', async () => {
                await expect(raffle.performUpkeep('0x')).to.be.revertedWithCustomError(raffle, 'Raffle_NotNeeded');
            });
        });
        describe('fulfillRandomWords', async () => {
            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send('evm_increaseTime', [Number(interval)]);
                await network.provider.send('evm_mine', []);
            });
            it('picks a winner, resets the lottery, and sends money', async () => {
                const additionalEntrants = 3;
                const startingAccountIndex = 1; // deployer 的 idx 是 0
                console.log(`player0: ${deployer}`);
                for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
                    const account = accounts[i];
                    const accountConnectedRaffle = await ethers.getContractAt('Raffle', raffleAddr, account);
                    await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                    console.log(`player${i}: ${account.address}`);
                }
                const startTimestamp = await raffle.getLatestTimestamp();

                await new Promise(async (resolve, reject) => {
                    // 监听一次 WinnerPicked 事件
                    const winnerStartBalance = await ethers.provider.getBalance(accounts[1].address);
                    console.log('winnerStartBalance: ', winnerStartBalance);
                    raffle.once('WinnerPicked', async () => {
                        console.log('Found the event!!!!!!');
                        try {
                            const recentWinner = await raffle.getRecentWinner();
                            console.log(`winner: ${recentWinner}`);
                            const winnerEndingBalance = await ethers.provider.getBalance(accounts[1].address);
                            const state = await raffle.getRaffleState();
                            const endTimestamp = await raffle.getLatestTimestamp();
                            const numPlayers = await raffle.getNumberOfPlayers();
                            assert.equal(numPlayers.toString(), '0');
                            assert.equal(state.toString(), '0');
                            assert.isTrue(endTimestamp > startTimestamp);
                            console.log(typeof raffleEntranceFee);
                            console.log(typeof winnerEndingBalance);
                            console.log(typeof winnerStartBalance);
                            console.log(typeof additionalEntrants);
                            assert.equal(winnerEndingBalance, winnerStartBalance + raffleEntranceFee * BigInt(additionalEntrants + 1));
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    });
                    try {
                        const tx = await raffle.performUpkeep('0x');
                        const txReceipt = await tx.wait(1);
                        // vrfCoordinatorV2Mock 内部会调用 raffle.fulfillRandomWords
                        await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.logs[1].args.requestId, raffle.target);
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });
}
