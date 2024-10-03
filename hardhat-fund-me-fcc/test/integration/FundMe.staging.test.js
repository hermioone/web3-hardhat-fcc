const { deployments, ethers, getNamedAccounts, network } = require('hardhat');
const { assert, expect } = require('chai');
const { developmentChains } = require('../../helper-hardhat-config');


const sendValue = ethers.parseEther('1');

developmentChains.includes(network.name)
    ? describe.skip    // 如果是 hardhat 环境，则跳过
    : describe('FundMe', async () => {
          let deployer;
          let signer;
          let fundMe;
          let mockV3Aggregator;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              signer = await ethers.getSigner(deployer);
              let contractAddress = (await deployments.get('FundMe')).address;
              fundMe = await ethers.getContractAt('FundMe', contractAddress, signer);
          });

          it("Allows people to fund and withdraw", async () => {
              await fundMe.fund({value: sendValue});
              await fundMe.withdraw();
              const endingBalance = await ethers.provider.getBalance(fundMe.target);
              assert.equal(endingBalance, 0);
          })
      });
