

## 1. 注意事项
需要 node 版本 >= 18

在这个项目中，仍然可以使用 `yarn hardhat deploy scripts/deploy.js` 来部署合约。

但是这个项目重点是讲解 hardhat-deploy 插件，使用这个插件后不需要再手动编写部署脚本。
这个插件自动执行的脚本位于 deploy 目录下

## 2. 变化
### 2.1 使用 hardhat-deploy 插件

步骤：
1. `yarn add --dev hardhat-deploy`
2. 在 hardhat.config.js 中加上 `require("hardhat-deploy")`

添加这个插件后，就可以看到 `yarn hardhat` 中添加了一个 deploy 的 task，这个 task 会自动执行 `deploy/` 目录下的所有 js 脚本（按照顺序）。

`deploy/` 目录下的 js 脚本都是下面的格式：

```js
module.exports = async ({ getNamedAccounts, deployments }) => {
    const deploy = deployments.deploy;
    const log = deployments.log;
    const deployer = await getNamedAccounts().deployer;
};
```

其实就等价于：

```js
module.exports = async (hre) => {
    const getNamedAccounts = hre.getNamedAccounts;
    const deployments = hre.deployments;
}
```

`hre` 是 hardhat-deploy 插件传入的参数，其实就是 `const hre = require("hardhat")`。

### 2.2 namedAccounts

namedAccounts 是 hardhat-deploy 的一個欄位
我們可以透過設定 namedAccounts 將 wallet 帳號跟一個名字綁定在一起

前面 Network 提到我們可以設定 accounts 欄位，用以提供擁有 testnet ETH 的帳號
而如果使用預設 Hardhat network, Hardhat 會自己生成一個大小為 20 個假帳號們，每個假帳號用有 1000 ETH 可以使用。

```json
const config: HardhatUserConfig = {
    namedAccounts: {
        deployer: {
            default: 0
        }
    }
}
export const config
```

上述定義了一個名為 deployer 的名字，它對應到 accounts array 的第 0 個帳號。
accounts 就是上面講的陣列，它可以是預設 20 個假帳號陣列，也可以是你定義的陣列(如果 Network 範例裡提到的)。更進階，你也可以針對不同網路，指定不同帳號。

```json
const config: HardhatUserConfig = {
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
            // chainId 為 1(mainnet) 的時候，使用第 0 個帳號

            4: '0xA296a3d5F026953e17F472B497eC29a5631FB51B',
            // chainId 為 4(rinkeby) 的時候，使用這個帳號

            "goerli": '0x84b9514E013710b9dD0811c9Fe46b837a4A0d8E0',
            // network 名字為 goerli 的時候，使用這個帳號
            // 其中 network name 必須跟 config 裡面 networks.<name> 的 name 一樣
        }
    }
}
```


## 3. 问题总结

### 3.1 verify
在部署完成 contract 后，verify contract，结果报了下面这个问题：
```shell
hermione in ~/workspace/javascript/web3/hh-fcc/hardhat-fund-me-fcc on master ● λ yarn hardhat run scripts/deploy.js --network sepolia
yarn run v1.22.22
$ /Users/hermione/workspace/javascript/web3/hh-fcc/hardhat-fund-me-fcc/node_modules/.bin/hardhat run scripts/deploy.js --network sepolia
FundMe has been deployed: 0x52Abcfe90dF66082ADFBF6d9A622a98Abae4e235
The contract 0x52Abcfe90dF66082ADFBF6d9A622a98Abae4e235 has already been verified on the block explorer. If you're trying to verify a partially verified contract, please use the --force flag.
https://sepolia.etherscan.io/address/0x52Abcfe90dF66082ADFBF6d9A622a98Abae4e235#code

FundMe has been verified.
✨  Done in 18.87s.
```

解决方案：在 hardhat.config.js 中加入 `require("@nomicfoundation/hardhat-verify");`

### 3.2 test 时报错

#### 3.2.1 getPriceFee is not a function
执行 `yarn hardhat test` 时报了下面的错：

![image-20241003132756873](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241003132756873.png)

经过排查后发现是因为单元测试代码在调用 `ethers.getContractAt()` 方法时没有加上 `await`，如下：
```js
const { deployments, ethers, getNamedAccounts } = require('hardhat');
const {assert} = require("chai");

describe('FundMe', async () => {
    let deployer;
    let fundMe;
    let mockV3Aggregator;

    beforeEach(async () => {
        // 部署 FundMe 合约
        // fixture 会运行 deploy 目录下的所有脚本，可以指定 tags
        await deployments.fixture(['all']);
        deployer = (await getNamedAccounts()).deployer;
        const signer = await ethers.getSigner(deployer)
        let contractAddr = (await deployments.get('FundMe')).address;
        fundMe = ethers.getContractAt('FundMe', contractAddr, signer);
        contractAddr = (await deployments.get('MockV3Aggregator')).address;
        mockV3Aggregator = ethers.getContractAt("MockV3Aggregator", contractAddr, signer);
    });

    describe('contructor', async () => {
        it("set the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFee();
            const actualAddress = await mockV3Aggregator.getAddress();
            assert.equal(response, actualAddress);
        })
    });
});
```

加上 `await` 后就可以了：
```js
const { deployments, ethers, getNamedAccounts } = require('hardhat');
const {assert} = require("chai");

describe('FundMe', async () => {
    let deployer;
    let fundMe;
    let mockV3Aggregator;

    beforeEach(async () => {
        // 部署 FundMe 合约
        // fixture 会运行 deploy 目录下的所有脚本，可以指定 tags
        await deployments.fixture(['all']);
        deployer = (await getNamedAccounts()).deployer;
        const signer = await ethers.getSigner(deployer)
        let contractAddr = (await deployments.get('FundMe')).address;
        fundMe = await ethers.getContractAt('FundMe', contractAddr, signer);
        contractAddr = (await deployments.get('MockV3Aggregator')).address;
        mockV3Aggregator = await ethers.getContractAt("MockV3Aggregator", contractAddr, signer);
    });

    describe('contructor', async () => {
        it("set the aggregator addresses correctly", async () => {
            const response = await fundMe.getPriceFee();
            const actualAddress = await mockV3Aggregator.getAddress();
            assert.equal(response, actualAddress);
        })
    });
});
```

[参考链接](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/1503)

#### 3.2.2 Cannot read properties of undefined (reading 'getBalance')
原来的代码：

```js
describe("withdraw", async () => {
    beforeEach(async () => {
        await fundMe.fund({value: sendValue});
    });
    it('Withdraw ETH from a single funder ', async function () {
        // 也可以使用 await fundMe.getAddress()
        const fundMeBalance = await fundMe.provider.getBalance(fundMe.target);
        const deployerBalance = await fundMe.provider.getBalance(deployer);

        const transactionResponse = await fundMe.withdraw();
        const transactionReceipt = await transactionResponse.wait(1);


        const endingFundMeBalance = await fundMe.provider.getBalance(await fundMe.getAddress());
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
        assert.equal(endingFundMeBalance, 0);
        assert.equal(fundMeBalance + deployerBalance, endingDeployerBalance + gasCost);
    });
})
```

执行时报了下面的错误：

![image-20241003142731492](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241003142731492.png)

在 ethers.js v6 中，需要使用 `ethers.provider.getBalance(fundMe.target)` 来替代 `fundMe.provider.getBalance(fundMe.address)`。

另外，在 v6 中，获取合约的地址可以使用 `fundMe.target` 也可以使用 `await fundMe.getAddress()`。

[参考链接](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/5967)