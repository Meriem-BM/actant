// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AgentWallet} from "../src/AgentWallet.sol";
import {AgentWalletFactory} from "../src/AgentWalletFactory.sol";

contract AgentWalletTest is Test {
    AgentWalletFactory factory;
    AgentWallet wallet;
    address owner = makeAddr("owner");

    function setUp() public {
        AgentWallet impl = new AgentWallet();
        factory = new AgentWalletFactory(address(impl));
    }

    // TODO: add tests once implementation is complete
    // function test_createWallet() public { ... }
    // function test_pay_withinDailyLimit() public { ... }
    // function test_pay_exceedsDailyLimit_reverts() public { ... }
    // function test_pay_exceedsPerTxLimit_reverts() public { ... }
    // function test_pay_unauthorizedRecipient_reverts() public { ... }
    // function test_dailyLimitResets_nextDay() public { ... }
}
