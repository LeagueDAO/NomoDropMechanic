// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

contract StrategyMock {
    event Received(address, uint256);

    function getBalance() public view returns (uint256) {
        uint256 contractBalance = address(this).balance;
        return contractBalance;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
