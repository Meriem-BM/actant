// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AgentWallet} from "../src/AgentWallet.sol";
import {AgentWalletFactory} from "../src/AgentWalletFactory.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

/**
 * @notice Mock ERC20 for testing USDC transfers without a real token
 */
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    string public name    = "USD Coin";
    string public symbol  = "USDC";
    uint8  public decimals = 6;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "MockERC20: insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "MockERC20: insufficient");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        return true;
    }
}

contract AgentWalletTest is Test {
    AgentRegistry      public registry;
    AgentWalletFactory public factory;
    AgentWallet        public wallet;
    MockERC20          public usdc;

    address owner    = makeAddr("owner");
    address operator = makeAddr("operator");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");

    bytes32 constant AGENT_ID      = keccak256("trading-bot");
    bytes32 constant MANIFEST_HASH = keccak256("agent.json");

    uint256 constant DAILY_LIMIT  = 50_000_000; // 50 USDC
    uint256 constant PER_TX_LIMIT =  5_000_000; //  5 USDC

    function setUp() public {
        usdc     = new MockERC20();
        registry = new AgentRegistry();

        AgentWallet impl = new AgentWallet();
        factory = new AgentWalletFactory(address(impl), address(registry), address(usdc));

        // Authorize factory in registry
        registry.addFactory(address(factory));

        // Create wallet as operator
        vm.prank(operator);
        address walletAddr = factory.createWallet(
            AGENT_ID,
            owner,
            DAILY_LIMIT,
            PER_TX_LIMIT,
            MANIFEST_HASH
        );
        wallet = AgentWallet(payable(walletAddr));

        // Fund the wallet with USDC
        usdc.mint(address(wallet), 100_000_000); // 100 USDC
    }

    // ─── Initialization ───────────────────────────────────────────────────

    function test_init_state() public view {
        assertEq(wallet.owner(),      owner);
        assertEq(wallet.agentId(),    AGENT_ID);
        assertEq(wallet.registry(),   address(registry));
        assertEq(wallet.dailyLimit(), DAILY_LIMIT);
        assertEq(wallet.perTxLimit(), PER_TX_LIMIT);
    }

    function test_init_registeredInRegistry() public view {
        assertTrue(registry.isActive(AGENT_ID));
        assertEq(registry.getWallet(AGENT_ID),   address(wallet));
        assertEq(registry.getOperator(AGENT_ID), operator);
    }

    function test_init_cannotReinitialize() public {
        vm.expectRevert(AgentWallet.AlreadyInitialized.selector);
        wallet.initialize(alice, AGENT_ID, address(registry), address(usdc), 1, 1);
    }

    // ─── pay() ────────────────────────────────────────────────────────────

    function test_pay_success() public {
        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(owner);
        wallet.pay(alice, 1_000_000, "test payment"); // $1 USDC

        assertEq(usdc.balanceOf(alice), aliceBefore + 1_000_000);
        assertEq(wallet.dailySpent(),   1_000_000);
    }

    function test_pay_exceedsPerTxLimit_reverts() public {
        vm.prank(owner);
        vm.expectRevert(AgentWallet.ExceedsPerTxLimit.selector);
        wallet.pay(alice, PER_TX_LIMIT + 1, "too large");
    }

    function test_pay_exceedsDailyLimit_reverts() public {
        // Spend up to the daily limit in multiple transactions
        vm.startPrank(owner);
        for (uint i = 0; i < 10; i++) {
            wallet.pay(alice, PER_TX_LIMIT, "batch");
        }
        // Next payment should fail (50 USDC daily limit reached)
        vm.expectRevert(AgentWallet.DailyLimitExceeded.selector);
        wallet.pay(alice, 1_000_000, "over limit");
        vm.stopPrank();
    }

    function test_pay_dailyLimitResets_nextDay() public {
        // Spend the full daily limit
        vm.startPrank(owner);
        for (uint i = 0; i < 10; i++) {
            wallet.pay(alice, PER_TX_LIMIT, "batch");
        }

        // Advance time by 1 day
        vm.warp(block.timestamp + 1 days);

        // Should succeed again
        wallet.pay(alice, PER_TX_LIMIT, "next day");
        vm.stopPrank();

        assertEq(wallet.dailySpent(), PER_TX_LIMIT);
    }

    function test_pay_unauthorizedReverts() public {
        vm.prank(alice); // not owner or entrypoint
        vm.expectRevert(AgentWallet.Unauthorized.selector);
        wallet.pay(bob, 1_000_000, "unauthorized");
    }

    function test_pay_zeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(AgentWallet.ZeroRecipient.selector);
        wallet.pay(address(0), 1_000_000, "zero");
    }

    function test_pay_logsToRegistry() public {
        vm.prank(owner);
        wallet.pay(alice, 1_000_000, "memo");

        assertEq(registry.getAgent(AGENT_ID).executionCount, 1);
        assertEq(registry.getAgent(AGENT_ID).totalSettled,   1_000_000);
    }

    // ─── Allowlist ────────────────────────────────────────────────────────

    function test_pay_withAllowlist_allowedRecipient() public {
        vm.prank(owner);
        wallet.allowRecipient(alice);

        vm.prank(owner);
        wallet.pay(alice, 1_000_000, "allowed");

        assertEq(usdc.balanceOf(alice), 1_000_000);
    }

    function test_pay_withAllowlist_blockedRecipient_reverts() public {
        vm.prank(owner);
        wallet.allowRecipient(alice);

        vm.prank(owner);
        vm.expectRevert(AgentWallet.RecipientNotAllowed.selector);
        wallet.pay(bob, 1_000_000, "blocked");
    }

    function test_disableAllowlist() public {
        vm.startPrank(owner);
        wallet.allowRecipient(alice);
        wallet.disableAllowlist();
        wallet.pay(bob, 1_000_000, "allowlist disabled");
        vm.stopPrank();

        assertEq(usdc.balanceOf(bob), 1_000_000);
    }

    // ─── Pause via registry ───────────────────────────────────────────────

    function test_pay_pausedAgent_reverts() public {
        vm.prank(operator);
        registry.pauseAgent(AGENT_ID);

        vm.prank(owner);
        vm.expectRevert(AgentWallet.AgentPausedOrRevoked.selector);
        wallet.pay(alice, 1_000_000, "paused");
    }

    function test_pay_revokedAgent_reverts() public {
        vm.prank(operator);
        registry.revokeAgent(AGENT_ID);

        vm.prank(owner);
        vm.expectRevert(AgentWallet.AgentPausedOrRevoked.selector);
        wallet.pay(alice, 1_000_000, "revoked");
    }

    function test_pay_resumedAgent_succeeds() public {
        vm.prank(operator);
        registry.pauseAgent(AGENT_ID);

        vm.prank(operator);
        registry.resumeAgent(AGENT_ID);

        vm.prank(owner);
        wallet.pay(alice, 1_000_000, "resumed");

        assertEq(usdc.balanceOf(alice), 1_000_000);
    }

    // ─── updateLimits ─────────────────────────────────────────────────────

    function test_updateLimits() public {
        vm.prank(owner);
        wallet.updateLimits(100_000_000, 10_000_000);

        assertEq(wallet.dailyLimit(), 100_000_000);
        assertEq(wallet.perTxLimit(), 10_000_000);
    }

    // ─── Factory: address prediction ─────────────────────────────────────

    function test_getWalletAddress_matchesDeployed() public view {
        address predicted = factory.getWalletAddress(AGENT_ID, owner);
        assertEq(predicted, address(wallet));
    }

    // ─── Factory: duplicate agentId reverts ───────────────────────────────

    function test_createWallet_duplicateAgentIdReverts() public {
        vm.prank(operator);
        vm.expectRevert(AgentWalletFactory.AgentIdAlreadyDeployed.selector);
        factory.createWallet(AGENT_ID, owner, DAILY_LIMIT, PER_TX_LIMIT, MANIFEST_HASH);
    }
}
