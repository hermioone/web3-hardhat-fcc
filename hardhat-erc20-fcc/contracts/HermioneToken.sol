// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract HermioneToken is ERC20 {
    constructor(uint256 initialSupply) ERC20('HermioneToken', 'Hert') {
        // 初始铸造 initialSupply 个 token
        // 假设我们想铸造 50 个 token，那么这里的 initialSupply 就需要设置为 50 * (10 ** 18)
        _mint(msg.sender, initialSupply);
    }
}
