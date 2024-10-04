## 1. 问题

### 1.1 withdraw 时的 owner 问题

使用 `yarn hardhat node` 创建本地测试链。在前端代码中连接 Metamask，并在 metamask 中添加本地测试链。

然后就可以编写前端 js 代码来调用 FundMe 合约（在创建本地测试链时会自动部署 FundMe 合约）。

在调用 `contract.withdraw()` 方法时可以正常调通，但是 withdraw 方法中是需要有 owner 判断的，为什么在 metamask 中添加的 account 可以调用 withdraw 方法呢？

经过打印 contract 中的 owner 字段发现，本地测试链在创建的时候会创建一批测试 account，而这些测试 account 中的第一个账号就是用来创建 FundMe 合约的账号，而我们在 metamask 中添加的 account 也恰好是第一个 account，所以就导致了 metamask 中的 account 恰好就是创建这个合约的账号，所以可以调用成功 withdraw 方法，如果在 metamask 中添加别的测试 account，则调用 withdraw 方法时会报错。

![image-20241004122054694](https://hermione-pic.oss-cn-beijing.aliyuncs.com/uPic/image-20241004122054694.png)

如上图可以看到，在创建本地测试链时，FundMe 合约是在 `0x0f7e061eccbbc520a1476bffd629722ac0accd828471697bd60a3b415bcde64f` 这个 transaction 中被创建，而在截图后面的 eth_blockerNumber 中显示，这个交易来自于 `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` 这个 account，而这个 account 就是 accounts 中的第一个账号。