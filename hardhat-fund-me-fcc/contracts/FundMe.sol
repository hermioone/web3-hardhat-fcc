// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// yarn add --dev @chainlink/contracts
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {PriceConverter} from "./PriceConverter.sol";

error FundMe_NotOwner();

/**
 * @title A contract for crowd funding
 * @author hermione
 * @notice This contract is to demo a sample funding contract
 */
contract FundMe {

    // 加上这个后，就相当于让 uint256 继承了 PriceConverter 中的所有函数
    using PriceConverter for uint256;

    mapping(address => uint256) public fundersToAmount;
    address[] public funders;
    // 10 USD（放大 10 ** 18 倍）
    uint256 constant private MINIMUM_VALUE = 10 * (10 ** 18);
    address private owner;

    AggregatorV3Interface private dataFeed;

    constructor(address priceFeed) {
        // 使用的 Sepolia 测试网
        dataFeed = AggregatorV3Interface(priceFeed);
        owner = msg.sender;
    }

    function fund() external payable {
        require(msg.value.getConversionRate(dataFeed) >= MINIMUM_VALUE, "Send more ETH.");
        fundersToAmount[msg.sender] = msg.value;
        funders.push(msg.sender);
    }


    function withdraw() public payable {
        require(msg.sender == owner, "This func can only be called by owner");

        for (uint256 idx = 0; idx < funders.length; idx++) {
            address funder = funders[idx];
            fundersToAmount[funder] = 0;
        }
        funders = new address[](0);

        // payable(msg.sender).transfer(address(this).balance);
        (bool success,) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Failed to withdraw");
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory m_funders = funders;
        // mapping 不能存储在 memory 中
        for (uint256 idx = 0; idx < m_funders.length; idx++) {
            address funder = m_funders[idx];
            fundersToAmount[funder] = 0;
        }
    }

    // modifier 有点类似于 AOP
    modifier onlyOwner {
        if (msg.sender != owner) {
            revert FundMe_NotOwner();
        }
        _;
    }

    function transferOwnership(address newOwner) onlyOwner public {
        owner = newOwner;
    }

    function getPriceFee() public view returns(AggregatorV3Interface)  {
        return dataFeed;
    }

    function getAddressToAmountFunded(address fundingAddress) public view returns (uint256){
        return fundersToAmount[fundingAddress];
    }

    function getFundersCount() public view returns(uint256)  {
        return funders.length;
    }
}
