const { deployments, ethers, getNamedAccounts, network } = require('hardhat');
const { assert, expect } = require('chai');
const { developmentChains } = require('../../helper-hardhat-config');

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('FundMe', async () => {
          let deployer;
          let signer;
          let fundMe;
          let mockV3Aggregator;

          beforeEach(async () => {
              // 部署 FundMe 合约
              // fixture 会运行 deploy 目录下的所有脚本，可以指定 tags
              await deployments.fixture(['all']);
              deployer = (await getNamedAccounts()).deployer;
              signer = await ethers.getSigner(deployer);
              let contractAddr = (await deployments.get('FundMe')).address;
              fundMe = await ethers.getContractAt('FundMe', contractAddr, signer);
              contractAddr = (await deployments.get('MockV3Aggregator')).address;
              mockV3Aggregator = await ethers.getContractAt('MockV3Aggregator', contractAddr, signer);
          });

          describe('constructor', async () => {
              it('set the aggregator addresses correctly', async () => {
                  const response = await fundMe.getPriceFee();
                  const actualAddress = await mockV3Aggregator.getAddress();
                  assert.equal(response, actualAddress);
              });
          });

          const sendValue = ethers.parseEther('1'); // 1ETH
          describe('fund', async () => {
              it("Fails if don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith('Send more ETH.');
              });

              it('Update the amount funded data structure', async () => {
                  await fundMe.fund({ value: sendValue });
                  console.log(deployer);
                  console.log(signer.address);
                  console.log(deployer === signer.address); // true
                  const response = await fundMe.getAddressToAmountFunded(deployer);
                  // 或者 const response = await fundMe.getAddressToAmountFunded(signer.address);
                  assert.equal(response.toString(), sendValue.toString());
                  const expectFundersCount = await fundMe.getFundersCount();
                  assert.equal('1', expectFundersCount.toString());
              });
          });

          describe('withdraw', async () => {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue });
              });
              it('Withdraw ETH from a single funder ', async function () {
                  // 也可以使用 await fundMe.getAddress()
                  const fundMeBalance = await ethers.provider.getBalance(fundMe.target);
                  const deployerBalance = await ethers.provider.getBalance(deployer);

                  const transactionResponse = await fundMe.withdraw();
                  const transactionReceipt = await transactionResponse.wait(1);

                  const { gasUsed, gasPrice } = transactionReceipt;
                  const gasCost = gasUsed * gasPrice;
                  const endingFundMeBalance = await ethers.provider.getBalance(await fundMe.getAddress());
                  const endingDeployerBalance = await ethers.provider.getBalance(deployer);
                  assert.equal(endingFundMeBalance, 0);
                  assert.equal(fundMeBalance + deployerBalance, endingDeployerBalance + gasCost);
              });
              it('Withdraw with multiple funders', async () => {
                  const accounts = await ethers.getSigners();
                  const contractAddr = (await deployments.get('FundMe')).address;
                  for (let i = 1; i <= 6; i++) {
                      // 因为 fundMe 绑定的是 deployer，

                      // 使用 accounts[i] 与部署的合约进行交互，下面2种方式都可以
                      // const connectedContract = await fundMe.connect(accounts[i]);
                      const connectedContract = await ethers.getContractAt('FundMe', contractAddr, accounts[i]);
                      await connectedContract.fund({ value: sendValue });
                  }

                  const fundMeBalance = await ethers.provider.getBalance(fundMe.target);
                  const deployerBalance = await ethers.provider.getBalance(deployer);
                  assert.equal(fundMeBalance.toString(), ethers.parseEther('7'));

                  const transactionResponse = await fundMe.withdraw();
                  const transactionReceipt = await transactionResponse.wait(1);
                  const { gasUsed, gasPrice } = transactionReceipt;
                  const gasCost = gasUsed * gasPrice;

                  const endingFundMeBalance = await ethers.provider.getBalance(await fundMe.getAddress());
                  const endingDeployerBalance = await ethers.provider.getBalance(deployer);

                  await expect(fundMe.funders(0)).to.be.reverted;
                  for (let i = 1; i <= 6; i++) {
                      const balance = await fundMe.fundersToAmount(accounts[i].address);
                      console.log(`balance: ${balance.toString()}, `, balance);
                      assert(balance.toString(), 0);
                  }

                  assert.equal(endingFundMeBalance, 0);
                  assert.equal(fundMeBalance + deployerBalance, endingDeployerBalance + gasCost);
              });

              it('Only allows the owner to withdraw', async () => {
                  const accounts = await ethers.getSigners();
                  const attacker = accounts[1];
                  const contractAddr = (await deployments.get('FundMe')).address;
                  const attackerConnectedContract = await ethers.getContractAt('FundMe', contractAddr, attacker);
                  await expect(attackerConnectedContract.withdraw()).to.be.revertedWith('This func can only be called by owner');
              });

              it('Only allows the owner to transfer', async () => {
                  const accounts = await ethers.getSigners();

                  // accounts[0] 就是我们在 hardhat.config.js 中定义的 deployer，所以我们要使用 accounts[1] 作为 attacker
                  console.log(accounts[0].address);
                  console.log(deployer);
                  console.log(accounts[0].address === deployer);
                  const attacker = accounts[1];
                  const newOwner = accounts[2];
                  const contractAddr = (await deployments.get('FundMe')).address;
                  const contract = await ethers.getContractAt('FundMe', contractAddr, attacker);
                  await expect(contract.transferOwnership(newOwner.address)).to.be.revertedWithCustomError(contract, 'FundMe_NotOwner');
              });
          });
      });
