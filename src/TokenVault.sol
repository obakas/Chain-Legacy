// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract TokenVault {
    address public owner;
    IERC20 public token;

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the vault owner");
        _;
    }

    // Anyone can send tokens to the vault (just approve + transferFrom)
    function sendTokens(uint256 amount) external {
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }

    // Owner claims tokens from the vault
    function claimTokens(uint256 amount) external onlyOwner {
        require(token.balanceOf(address(this)) >= amount, "Not enough tokens");
        require(token.transfer(msg.sender, amount), "Transfer failed");
    }

    // Check vault balance
    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
