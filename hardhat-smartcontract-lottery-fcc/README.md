
彩票合约项目

# 1. 项目依赖
使用 `yarn hardhat` 初始化项目后，还需添加下面的依赖：
`yarn hardhat --dev hardhat-deploy dotenv hardhat-contract-sizer prettier`。

可以全局安装一个 hardhat-shorthand 的 npm 库，来提供一个 `yarn hardhat` 的缩写：

```shell
yarn global add hardhat-shorthand
```

安装成功后，我们可以使用 `hh compile` 来替代 `yarn hardhat compile`。

# 2. 项目简介

## 2.1 随机数
这是一个彩票合约项目，项目中每隔几分钟需要随机挑选一个 player 作为 winner，获取奖池中的所有 ETH，因此就需要使用随机数，这里我们使用的链下随机数生成的方法，即使用 chainlink VRFV2。

首先需要安装依赖：

```shell
yarn add --dev @chainlink/contracts
```

chainlink VRF 的调用过程会拆成2笔交易：
1. 调用 VRFCoordinatorV2Interface 接口合约中的 requestRandomWords 函数申请随机数（合约部署后，需要把合约加入到Subscription的Consumers中，才能发送申请）
2. VRF合约验证签名有效之后，会自动调用用户合约的回退函数fulfillRandomness()，将链下生成的随机数发送过来，我们需要在当前合约中保存随机数。

## 2.2 彩票合约自动运行

彩票合约需要定期执行：挑选一个幸运 winner 获得全部奖金。这个自动执行需要使用 chainlink Automation。

## 2.3 事件监听

在 ethers 中，我们可以监听合约事件：
- `contract.on("eventName", () => {})`：持续监听合约事件
- `contract.once("eventName", () => {})`：只监听一次

[参考](https://github.com/WTFAcademy/WTF-Ethers/blob/main/08_ContractListener/readme.md)


## 2.4 获取账户余额

在 hardhat 中可以通过下面的代码获得账户余额：

```js
const accounts = await ethers.getSigners();
const balance = await ethers.provider.getBalance(accounts[1].address);
```


# 3. 问题
## 3.1 Cannot read properties of undefined (reading '0')

这个发生在 `01-deploy-raffle.js` 文件中。

![image-20241005132427680](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241005132427680.png)

也就是在这一行：

```js
subscriptionId = transactionReceipt.events[0].args.subId;
```

在 ethers.js V6 版本中需要改成下面：

```js
subscriptionId = transactionReceipt.logs[0].args.subId;
```

[参考链接](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/6377)

## 3.2 contract runner does not support calling

具体错误信息如下：
```shell
1) Raffle Unit Test
       constructor
         initialize the raffle correctly:
     Error: contract runner does not support calling (operation="call", code=UNSUPPORTED_OPERATION, version=6.13.3)
      at makeError (node_modules/ethers/src.ts/utils/errors.ts:694:21)
      at assert (node_modules/ethers/src.ts/utils/errors.ts:715:25)
      at staticCallResult (node_modules/ethers/src.ts/contract/contract.ts:330:15)
      at staticCall (node_modules/ethers/src.ts/contract/contract.ts:303:30)
      at Proxy.getRaffleState (node_modules/ethers/src.ts/contract/contract.ts:351:47)
      at Context.<anonymous> (test/unit/Raffle.test.js:21:52)
```

![image-20241005135618421](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241005135618421.png)

原因是 ut 的代码中获取 contract 的代码有误：

```js
beforeEach(async () => {
              const { deployer } = await getNamedAccounts();
              await deployments.fixture('all');
              const raffleAddr = (await deployments.get('Raffle')).address;
              const vrfCoordinatorV2MockAddr = (await deployments.get('VRFCoordinatorV2Mock')).address;
              raffle = await ethers.getContractAt('Raffle', raffleAddr, deployer);
              vrfCoordinatorV2Mock = await ethers.getContractAt('VRFCoordinatorV2Mock', vrfCoordinatorV2MockAddr, deployer);
          });
```

实际上在调用 `await ethers.getContractAt` 时，最后一个参数应该传入 signer：

```js
beforeEach(async () => {
              const { deployer } = await getNamedAccounts();
              const signer = await ethers.getSigner(deployer);
              await deployments.fixture('all');
              const raffleAddr = (await deployments.get('Raffle')).address;
              const vrfCoordinatorV2MockAddr = (await deployments.get('VRFCoordinatorV2Mock')).address;
              raffle = await ethers.getContractAt('Raffle', raffleAddr, signer);
              vrfCoordinatorV2Mock = await ethers.getContractAt('VRFCoordinatorV2Mock', vrfCoordinatorV2MockAddr, signer);
          });
```

## 3.3 interval.toNumber is not a function

原来的代码为：

```js
it("not allow entrance when raffle is pending", async () => {
    await raffle.enterRaffle({value: raffleEntranceFee});
    await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
    await network.provider.send("evm_mine", []);    // 向前挖了一个区块
    await raffle.performUpkeep("0x");
    await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWithCustomError(raffle, "Raffle_NotOpen");
});
```

修改为：

```js
it("not allow entrance when raffle is pending", async () => {
    await raffle.enterRaffle({value: raffleEntranceFee});
    await network.provider.send("evm_increaseTime", [Number(interval) + 1]);
    await network.provider.send("evm_mine", []);    // 向前挖了一个区块
    await raffle.performUpkeep("0x");
    await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWithCustomError(raffle, "Raffle_NotOpen");
});
```

[参考链接](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/6383)

## 3.4 VM Exception while processing transaction

执行 `hh test` 时报了下面的错：
```shell
1) Raffle Unit Test
       enterRaffle
         not allow entrance when raffle is pending:
     Error: VM Exception while processing transaction: reverted with custom error 'InvalidConsumer()'
    at VRFCoordinatorV2Mock.onlyValidConsumer (@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol:92)
    at VRFCoordinatorV2Mock.requestRandomWords (@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2Mock.sol:165)
    at Raffle.pickRandomWinner (contracts/Raffle.sol:152)
    at Raffle.performUpkeep (contracts/Raffle.sol:138)
    at EdrProviderWrapper.request (node_modules/hardhat/src/internal/hardhat-network/provider/provider.ts:428:41)
    at HardhatEthersSigner.sendTransaction (node_modules/@nomicfoundation/hardhat-ethers/src/signers.ts:125:18)
    at send (node_modules/ethers/src.ts/contract/contract.ts:313:20)
    at Proxy.performUpkeep (node_modules/ethers/src.ts/contract/contract.ts:352:16)
    at Context.<anonymous> (test/unit/Raffle.test.js:48:17)
```


![image-20241005165343245](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241005165343245.png)

这个原因是在新版的 chainlink 中要求，必须把合约地址加入到 VrfCoordinator 的 consumer 中，或者通过代码添加，或者在 UI 中添加。因此需要修改 `01-deploy-raffle.js` 文件，添加下面一段代码：

```js
if(developmentChains.includes(network.name)) {
    // In latest version of Chainlink/contracts 0.6.1 or after 0.4.1, we need to add consumer explicitly after deployment of contract
    const vrfCoordinatorV2 = await ethers.getContractAt('VRFCoordinatorV2Mock', vrfCoordinatorV2Addr);
    await vrfCoordinatorV2.addConsumer(subscriptionId, raffle.address);
    deployments.log('Consumer is added')
}
```

![image-20241005165604148](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241005165604148.png)


[参考链接](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/1565)

## 3.5 Cannot read properties of undefined (reading 'checkUpkeep')

最开始的代码是这样的：

```js
describe('checkUpKeep', async () => {
    it('returns false if no ETH in balance', async () => {
        await network.provider.send('evm_increaseTime', [Number(interval) + 1]);
        await network.provider.send('evm_mine', []);
        // callStatic 可以模拟 transaction 而不是真的发送 transaction，如果调用成功的话就返回 true，否则报错并返回失败原因
        // callStatic 可以节省发送真实 transaction 时所花费的 gas
        // metamask 中有的时候在确认一笔 transaction 也会提示你这个 transaction 可能会失败，和这个一样的原理
        // 底层都是使用的以太坊节点的 `eth_call()` 方法，让用户模拟一笔教育
        const { upkeepNeeded, _ } = await raffle.callStatic.checkUpkeep('0x');
        console.log(upkeepNeeded);
        assert.isFalse(upkeepNeeded);
    });
});
```

然后就报了下面的错：
```shell
TypeError: Cannot read properties of undefined (reading 'checkUpkeep')
      at Context.<anonymous> (test/unit/Raffle.test.js:61:62)
```

![image-20241005172326243](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241005172326243.png)

需要将代码改为：
```js
describe('checkUpKeep', async () => {
    it('returns false if no ETH in balance', async () => {
        await network.provider.send('evm_increaseTime', [Number(interval) + 1]);
        await network.provider.send('evm_mine', []);

        // const { upkeepNeeded, _ } = await raffle.checkUpkeep.staticCall('0x'); 这2种都可以
        const { upkeepNeeded, _ } = await raffle.checkUpkeep.staticCall(new Uint8Array());
        console.log(upkeepNeeded);
        assert.isFalse(upkeepNeeded);
    });
});
```
`staticCall` 可以模拟 transaction 而不是真的发送 transaction，如果调用成功的话就返回 true，否则报错并返回失败原因。假设 `checkUpkeep` 方法没有标注为 view，
那么在 ut 中真实调用这个方法会花费 gas，因此可以使用 `staticCall`，节省发送真实 transaction 时所花费的 gas。

metamask 中有的时候在确认一笔 transaction 也会提示你这个 transaction 可能会失败，和这个一样的原理。底层都是使用的以太坊节点的 `eth_call()` 方法，让用户模拟一笔交易。




[参考1](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/5789)
[参考2](https://github.com/smartcontractkit/full-blockchain-solidity-course-js/discussions/975)


## 3.6 Timeout of 40000ms exceeded.

执行 `hh test` 时最后一个测试 case：`picks a winner, resets the lottery, and sends money` 报了下面的错：

```shell
1) Raffle Unit Test
       fulfillRandomWords
         picks a winner, resets the lottery, and sends money:
     Error: Timeout of 40000ms exceeded. For async tests and hooks, ensure "done()" is called; if returning a Promise, ensure it resolves. (/Users/hermione/workspace/javascript/web3/hh-fcc/hardhat-smartcontract-lottery-fcc/test/unit/Raffle.test.js)
      at listOnTimeout (node:internal/timers:581:17)
      at processTimers (node:internal/timers:519:7)
```

![image-20241006112537140](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006112537140.png)

这个原因是在 Promise 中执行的代码抛了异常，但是没有使用 try catch，所以导致 Promise 中的代码执行异常时并没有执行 `reject()` 方法，从而导致超时了。

![image-20241006162733669](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006162733669.png)

就是上图红框中的代码抛了异常。代码修改后如下所示：

```js
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
            const tx = await raffle.performUpkeep();
            const txReceipt = await tx.wait(1);
            // vrfCoordinatorV2Mock 内部会调用 raffle.fulfillRandomWords
            await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.logs[1].args.requestId, raffle.target);
        } catch (e) {
            reject(e);
        }
    });
});
```

再次执行后报了下面的异常：

```shell
1) Raffle Unit Test
       fulfillRandomWords
         picks a winner, resets the lottery, and sends money:
     Error: no matching fragment (operation="fragment", info={ "args": [  ], "key": "performUpkeep" }, code=UNSUPPORTED_OPERATION, version=6.13.3)
      at makeError (node_modules/ethers/src.ts/utils/errors.ts:694:21)
      at assert (node_modules/ethers/src.ts/utils/errors.ts:715:25)
      at getFragment (node_modules/ethers/src.ts/contract/contract.ts:270:15)
      at Proxy.performUpkeep (node_modules/ethers/src.ts/contract/contract.ts:350:26)
      at /Users/hermione/workspace/javascript/web3/hh-fcc/hardhat-smartcontract-lottery-fcc/test/unit/Raffle.test.js:154:49
```

![image-20241006163031314](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006163031314.png)

这个是因为 `const tx = await raffle.performUpkeep();` 调用时没有传递参数，改成 `const tx = await raffle.performUpkeep("0x");` 即可。


原因就是因为 `performUpkeep()` 函数中没有传参：

![image-20241006112726776](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006112726776.png)

修改后在函数参数中传入默认控制 `"0x"`，这个 ut case 即可执行成功
```js
it('picks a winner, resets the lottery, and sends money', async () => {
    const additionalEntrants = 3;
    const startingAccountIndex = 1; // deployer 的 idx 是 0
    for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
        const account = accounts[i];
        const accountConnectedRaffle = await ethers.getContractAt('Raffle', raffleAddr, account);
        await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
    }
    const startTimestamp = await raffle.getLatestTimestamp();

    await new Promise(async (resolve, reject) => {
        // 监听一次 WinnerPicked 事件
        raffle.once('WinnerPicked', async () => {
            console.log('Found the event!!!!!!');
            try {
                const recentWinner = await raffle.getRecentWinner();
                const state = await raffle.getRaffleState();
                const endTimestamp = await raffle.getLatestTimestamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                assert.equal(numPlayers.toString(), "0");
                assert.equal(state.toString(), "0");
                assert.isTrue(endTimestamp > startTimestamp);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
        const tx = await raffle.performUpkeep();
        const txReceipt = await tx.wait(1);
        await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.logs[1].args.requestId, raffle.target);
    });
});
```

## 3.7 Cannot mix BigInt and other types, use explicit conversions
执行 `hh test` 时最后一个测试 case：`picks a winner, resets the lottery, and sends money` 报了下面的错：

```shell
12 passing (747ms)
  1 failing

  1) Raffle Unit Test
       fulfillRandomWords
         picks a winner, resets the lottery, and sends money:
     TypeError: Cannot mix BigInt and other types, use explicit conversions
      at Proxy.<anonymous> (test/unit/Raffle.test.js:149:143)
```

![image-20241006115348618](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006115348618.png)

原因就是 js 代码中数学运算时发生了隐式的类型转换，出错代码集中在这里：

```js
const raffleEntranceFee = await raffle.getEntranceFee();
const winnerStartBalance = await ethers.provider.getBalance(accounts[1].address);
const winnerEndingBalance = await ethers.provider.getBalance(accounts[1].address);
const additionalEntrants = 3;

console.log(typeof(raffleEntranceFee));                 // bigint
console.log(typeof(winnerEndingBalance));               // bigint
console.log(typeof(winnerStartBalance));                // bigint
console.log(typeof(additionalEntrants));                // number
assert.equal(winnerEndingBalance, winnerStartBalance + raffleEntranceFee * (additionalEntrants + 1));
```

从上面的代码可以看到，`raffleEntranceFee` 和 `winnerEndingBalance` 和 `winnerStartBalance` 都是通过 hardhat 的 api 获取到的链上的返回值。这些值的类型都是 BigInt。而 `additionalEntrants` 则是在 js 代码中自己定义的一个数字，类型是 Number，因此下面的数学运算中涉及到了 BigInt 和 Number，所以就报错了。

修改方式，将 Number 类型转为 BigInt：
```js
assert.equal(winnerEndingBalance, winnerStartBalance + raffleEntranceFee * BigInt(additionalEntrants + 1));
```

**BigInt 是一种内置对象，它提供了一种方法来表示大于 2^53 - 1 的整数。这原本是 Javascript 中可以用 Number 表示的最大数字。BigInt 可以表示任意大的整数。可以用在一个整数字面量后面加 n 的方式定义一个 BigInt ，如：10n，或者调用函数 BigInt()（但不包含 new 运算符）并传递一个整数值或字符串值。**

```js
const theBiggestInt = 9007199254740991n;

const alsoHuge = BigInt(9007199254740991);
// ↪ 9007199254740991n

const hugeString = BigInt("9007199254740991");
// ↪ 9007199254740991n

const hugeHex = BigInt("0x1fffffffffffff");
// ↪ 9007199254740991n

const hugeBin = BigInt(
  "0b11111111111111111111111111111111111111111111111111111",
);
// ↪ 9007199254740991n
```

## 3.8 reverted with custom error 'InsufficientBalance()

刚开始时使用的是 chainlink VRF2 的 API，但是现在 VRF 已经到了 V2.5 的版本，因此将 raffle 合约升级到 v2.5 版本过程中，执行 `hh test` 时报了下面的错：

```shell
1) Raffle Unit Test
       fulfillRandomWords
         picks a winner, resets the lottery, and sends money:
     Error: VM Exception while processing transaction: reverted with custom error 'InsufficientBalance()'
    at VRFCoordinatorV2_5Mock._chargePayment (@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol:163)
    at VRFCoordinatorV2_5Mock.fulfillRandomWordsWithOverride (@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol:145)
    at VRFCoordinatorV2_5Mock.fulfillRandomWords (@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol:104)
    at EdrProviderWrapper.request (node_modules/hardhat/src/internal/hardhat-network/provider/provider.ts:428:41)
    at HardhatEthersSigner.sendTransaction (node_modules/@nomicfoundation/hardhat-ethers/src/signers.ts:125:18)
    at send (node_modules/ethers/src.ts/contract/contract.ts:313:20)
    at Proxy.fulfillRandomWords (node_modules/ethers/src.ts/contract/contract.ts:352:16)
    at /Users/hermione/workspace/javascript/web3/hh-fcc/hardhat-smartcontract-lottery-fcc/test/unit/Raffle.test.js:158:25
```

![image-20241006163331391](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006163331391.png)

顺着异常堆栈查找发现，报错的地方在 `VRFCoordinatorV2_5Mock.sol` 中：

![image-20241006163523377](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241006163523377.png)

出错的位置在第 155 行，也就是先判断 `nativePayment` 为 true 后，抛了异常，阅读 VRFCoordinatorV2_5Mock 合约的源码后可以发现，`nativePayment` 为 true 代表合约使用 LINK 扣款，为 false 则表示使用 ETH 扣款。
```solidity
struct Subscription {
    uint96 balance;         // ETH 的数量
    uint96 nativeBalance;   // LINK 的数量
    uint64 reqCount;
}
```

但是在 VRFCoordinatorV2_5Mock 的 `fundSubscription()` 方法中，只修改了每个 subId 的 balance，也就是如果调用这个方法，就是给 VRFCoordinatorV2_5Mock 这个合约支付 ETH，所以我们也应该让 VRFCoordinatorV2_5Mock 合约回调 `fulfillRandomWords()` 方法时也使用 ETH 支付，即让 `nativePayment` 为 false。这个字段是我们生成 requestId 时传入的：

```solidity
function pickRandomWinner() internal {
    /**
    * 使用chainlink VRF，构造函数需要继承 VRFConsumerBaseV2
    * 不同链参数填的不一样
    * 具体可以看：https://docs.chain.link/vrf/v2-5/getting-started
    * 网络: Sepolia测试网
    */
    // 将状态置为 PENDING，此时不允许其他观众再参与
    s_raffleState = RaffleState.PENDING;
    uint256 requestId = s_vrfCoordinator.requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest({
            keyHash: i_gasLane,
            subId: i_subId,
            requestConfirmations: REQUEST_COMFIRMATIONS,
            callbackGasLimit: i_callbackGasLimit,
            numWords: NUM_WORDS,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({ nativePayment: true }))
        })
    );
    emit RequestRaffleWinner(requestId);
}
```

从代码中可以看到，我们调用时传入的是 true，所以导致了 `nativePayment` 为 true，从而造成了这个问题。

解决办法就是将这个值也参数化，通过构造函数传入，当进行 UT 测试时传入 false，否则传入 true。



# 4. 特殊强调

## 4.1 address 和 target

在 js 代码中经常搞混 address 和 target，不知道哪里该用 target，哪里该用 address，这里总结下：

```js
const raffle = await deployments.deploy('Raffle', {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
});
const vrfCoordinatorV2 = await ethers.getContractAt('VRFCoordinatorV2Mock', vrfCoordinatorV2Addr);
await vrfCoordinatorV2.addConsumer(subscriptionId, raffle.address);


deployments.log(`raffle.address is ${raffle.address}`);
deployments.log(`raffle.target is ${raffle.target}`);
deployments.log(`vrfCoordinatorV2.address is ${vrfCoordinatorV2.address}`);
deployments.log(`vrfCoordinatorV2.target is ${vrfCoordinatorV2.target}`);
deployments.log(`vrfCoordinatorV2.target is ${await vrfCoordinatorV2.getAddress()}`);
```

上面这段代码来自于 `01-deploy-raffle.js` 中的一个片段，当执行 `hh deploy` 时，这段代码的输出结果为：
```shell
raffle.address is 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
raffle.target is undefined
vrfCoordinatorV2.address is undefined
vrfCoordinatorV2.target is 0x5FbDB2315678afecb367f032d93F642f64180aa3
vrfCoordinatorV2.target is 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

从以上结果中可以知道，对于 `await deploy()` 的结果来说，应该使用 `address`；而对于通过 `await ethers.getContractAt()` 方式获得的 contract 来说，应该使用 `target` 或 `await contract.getAddress()`。
