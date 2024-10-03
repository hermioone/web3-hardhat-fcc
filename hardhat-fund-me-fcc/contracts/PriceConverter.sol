// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// yarn add --dev @chainlink/contracts
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

library PriceConverter {

    function getConversionRate(uint256 ethAmount, AggregatorV3Interface dataFeed) internal view returns (uint256) {
        // ethAmount 是以 wei 为单位（放大了 10 ** 18 ），但是 ethPrice 是（ETH / USD）的结果放大 10 ** 8
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        uint256 ethPrice = uint256(answer);
        // 为了统一位数，这个 func 的结果要放大 10 ** 18，所以需要除以 10 ** 8
        return ethAmount * ethPrice / (10 ** 8);
    }

}