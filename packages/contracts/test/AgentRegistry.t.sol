// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {IAgentRegistry} from "../src/interfaces/IAgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;

    address operator  = makeAddr("operator");
    address wallet    = makeAddr("wallet");
    address stranger  = makeAddr("stranger");

    bytes32 constant AGENT_ID      = keccak256("test-agent");
    bytes32 constant MANIFEST_HASH = keccak256("agent.json content");

    function setUp() public {
        registry = new AgentRegistry();
    }

    // ─── Registration ─────────────────────────────────────────────────────

    function test_registerAgent_success() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        IAgentRegistry.AgentRecord memory rec = registry.getAgent(AGENT_ID);
        assertEq(rec.wallet,          wallet);
        assertEq(rec.operator,        operator);
        assertEq(rec.manifestHash,    MANIFEST_HASH);
        assertEq(uint8(rec.status),   uint8(IAgentRegistry.Status.Active));
        assertEq(rec.reputationScore, 5000); // starts at 50%
    }

    function test_registerAgent_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit IAgentRegistry.AgentRegistered(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);
    }

    function test_registerAgent_duplicateReverts() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(operator);
        vm.expectRevert(AgentRegistry.AgentIdTaken.selector);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);
    }

    function test_registerAgent_zeroWalletReverts() public {
        vm.prank(operator);
        vm.expectRevert(AgentRegistry.ZeroWallet.selector);
        registry.registerAgent(AGENT_ID, address(0), operator, MANIFEST_HASH);
    }

    function test_registerAgent_strangerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.UnauthorizedCaller.selector);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);
    }

    // ─── isActive ─────────────────────────────────────────────────────────

    function test_isActive_true_afterRegister() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);
        assertTrue(registry.isActive(AGENT_ID));
    }

    function test_isActive_false_unregistered() public view {
        assertFalse(registry.isActive(keccak256("unknown")));
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────

    function test_pauseAgent() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(operator);
        registry.pauseAgent(AGENT_ID);

        assertFalse(registry.isActive(AGENT_ID));
        assertEq(
            uint8(registry.getAgent(AGENT_ID).status),
            uint8(IAgentRegistry.Status.Paused)
        );
    }

    function test_pauseAgent_strangerReverts() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.NotOperator.selector);
        registry.pauseAgent(AGENT_ID);
    }

    function test_resumeAgent() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(operator);
        registry.pauseAgent(AGENT_ID);

        vm.prank(operator);
        registry.resumeAgent(AGENT_ID);

        assertTrue(registry.isActive(AGENT_ID));
    }

    function test_revokeAgent_cannotPause() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(operator);
        registry.revokeAgent(AGENT_ID);

        vm.prank(operator);
        vm.expectRevert(AgentRegistry.AgentIsRevoked.selector);
        registry.pauseAgent(AGENT_ID);
    }

    // ─── Manifest update ──────────────────────────────────────────────────

    function test_updateManifest() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        bytes32 newHash = keccak256("new agent.json");
        vm.prank(operator);
        registry.updateManifest(AGENT_ID, newHash);

        assertEq(registry.getAgent(AGENT_ID).manifestHash, newHash);
    }

    // ─── Execution logging ────────────────────────────────────────────────

    function test_logExecution_byWallet() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        bytes32 logHash = keccak256("execution log entry");
        vm.prank(wallet);
        registry.logExecution(AGENT_ID, logHash, 1_000_000, true); // $1 USDC

        IAgentRegistry.AgentRecord memory rec = registry.getAgent(AGENT_ID);
        assertEq(rec.executionCount, 1);
        assertEq(rec.totalSettled,   1_000_000);
        assertGt(rec.reputationScore, 5000); // should go up after success
    }

    function test_logExecution_byOperator() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        bytes32 logHash = keccak256("execution log");
        vm.prank(operator);
        registry.logExecution(AGENT_ID, logHash, 500_000, true);

        assertEq(registry.getAgent(AGENT_ID).executionCount, 1);
    }

    function test_logExecution_strangerReverts() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.UnauthorizedLogger.selector);
        registry.logExecution(AGENT_ID, keccak256("log"), 100, true);
    }

    function test_reputationIncreases_onSuccess() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        uint16 startScore = registry.getAgent(AGENT_ID).reputationScore;

        vm.startPrank(wallet);
        for (uint i = 0; i < 5; i++) {
            registry.logExecution(AGENT_ID, keccak256(abi.encode("log", i)), 100, true);
        }
        vm.stopPrank();

        uint16 endScore = registry.getAgent(AGENT_ID).reputationScore;
        assertGt(endScore, startScore);
    }

    function test_reputationDecreases_onFailure() public {
        vm.prank(operator);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        vm.startPrank(wallet);
        for (uint i = 0; i < 5; i++) {
            registry.logExecution(AGENT_ID, keccak256(abi.encode("s", i)), 100, true);
        }
        uint16 highScore = registry.getAgent(AGENT_ID).reputationScore;

        for (uint i = 0; i < 5; i++) {
            registry.logExecution(AGENT_ID, keccak256(abi.encode("f", i)), 0, false);
        }
        vm.stopPrank();

        uint16 lowScore = registry.getAgent(AGENT_ID).reputationScore;
        assertLt(lowScore, highScore);
    }

    // ─── Enumeration ──────────────────────────────────────────────────────

    function test_getAgentsByOperator() public {
        bytes32 id1 = keccak256("agent-1");
        bytes32 id2 = keccak256("agent-2");

        vm.startPrank(operator);
        registry.registerAgent(id1, makeAddr("w1"), operator, MANIFEST_HASH);
        registry.registerAgent(id2, makeAddr("w2"), operator, MANIFEST_HASH);
        vm.stopPrank();

        bytes32[] memory agents = registry.getAgentsByOperator(operator);
        assertEq(agents.length, 2);
        assertEq(agents[0], id1);
        assertEq(agents[1], id2);
    }

    // ─── addFactory ───────────────────────────────────────────────────────

    function test_addFactory_allowsTrustedRegistration() public {
        address factory = makeAddr("factory");
        registry.addFactory(factory);

        vm.prank(factory);
        registry.registerAgent(AGENT_ID, wallet, operator, MANIFEST_HASH);

        assertTrue(registry.isActive(AGENT_ID));
    }

    function test_addFactory_notOwnerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.NotOwner.selector);
        registry.addFactory(makeAddr("factory"));
    }
}
