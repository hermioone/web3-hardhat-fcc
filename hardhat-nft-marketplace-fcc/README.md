## 1. 简介

这个项目是做一个 nft 的交易所。作为一个交易所，需要提供以下功能：

- listItem：seller 将 nft 委托给交易所去卖，也就是在交易所上架 nft
- buyItem：buyer 购买这个交易所，将资金转到交易所的 contract 中
- cancelListing：seller 取消 nft 的上架
- updateListing：seller 更改 nft 的价格
- withdrawProceeds：seller 将售卖 nft 的钱从交易所的 contract 中提取到自己的钱包


## 注意事项

### 1. hardhat 的 js 代码中传入参数和携带钱

当调用 `nftMarketPlace.buyItem()` 函数时，既需要传入参数，同时需要转一定的 ETH 到交易所的 contract 中，此时这个函数必须这样调用：

```js
// {value: PRICE} 必须作为最后一个参数传入
await playerNftMarketPlace.buyItem(basicNft.target, TOKEN_ID, {value: PRICE});
```