# =============================================================================
#  Actant Contracts — Makefile
#  Usage: make <target>
#
#  Required env vars (set in .env or export before running):
#    DEPLOYER_PRIVATE_KEY    — deployer private key (hex, with or without 0x)
#    BASE_SEPOLIA_RPC_URL    — Base Sepolia RPC endpoint
#    BASE_MAINNET_RPC_URL    — Base Mainnet RPC endpoint
#    BASESCAN_API_KEY        — for --verify (optional)
# =============================================================================

-include .env
export

# -----------------------------------------------------------------------------
#  Config
# -----------------------------------------------------------------------------

FORGE          := forge
SCRIPT         := script/Deploy.s.sol
LOCAL_RPC      := http://127.0.0.1:8545
LOCAL_KEY      := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Anvil default chain id
LOCAL_CHAIN_ID := 31337

# Colors
RESET  := \033[0m
BOLD   := \033[1m
GREEN  := \033[32m
YELLOW := \033[33m
CYAN   := \033[36m
RED    := \033[31m

# -----------------------------------------------------------------------------
#  Help (default target)
# -----------------------------------------------------------------------------

.PHONY: help
help:
	@echo ""
	@echo "$(BOLD)Actant Contracts$(RESET)"
	@echo ""
	@echo "$(CYAN)Build & Test$(RESET)"
	@echo "  make build          Compile all contracts"
	@echo "  make test           Run full test suite"
	@echo "  make test-v         Run tests with verbose output"
	@echo "  make test-vvv       Run tests with traces"
	@echo "  make clean          Remove build artifacts"
	@echo "  make snapshot       Generate gas snapshot"
	@echo ""
	@echo "$(CYAN)Local (Anvil)$(RESET)"
	@echo "  make anvil          Start local Anvil node"
	@echo "  make deploy-local   Deploy to local Anvil (uses default key #0)"
	@echo ""
	@echo "$(CYAN)Base Sepolia$(RESET)"
	@echo "  make deploy-sepolia         Deploy (no verification)"
	@echo "  make deploy-sepolia-verify  Deploy + verify on Basescan"
	@echo ""
	@echo "$(CYAN)Base Mainnet$(RESET)"
	@echo "  make deploy-mainnet         Deploy (no verification)"
	@echo "  make deploy-mainnet-verify  Deploy + verify on Basescan"
	@echo ""
	@echo "$(CYAN)Utilities$(RESET)"
	@echo "  make wallet         Generate a new wallet (cast wallet new)"
	@echo "  make balance        Check deployer ETH balance on Base Sepolia"
	@echo "  make balance-mainnet  Check deployer ETH balance on Base Mainnet"
	@echo "  make size           Print contract sizes"
	@echo ""
	@echo "$(YELLOW)Required env vars:$(RESET)"
	@echo "  DEPLOYER_PRIVATE_KEY   — used for sepolia + mainnet deploys"
	@echo "  BASE_SEPOLIA_RPC_URL   — Base Sepolia RPC"
	@echo "  BASE_MAINNET_RPC_URL   — Base Mainnet RPC"
	@echo "  BASESCAN_API_KEY       — for --verify targets"
	@echo ""

# -----------------------------------------------------------------------------
#  Build & Test
# -----------------------------------------------------------------------------

.PHONY: build
build:
	@echo "$(BOLD)$(CYAN)Building contracts…$(RESET)"
	$(FORGE) build

.PHONY: test
test:
	@echo "$(BOLD)$(CYAN)Running tests…$(RESET)"
	$(FORGE) test

.PHONY: test-v
test-v:
	$(FORGE) test -vv

.PHONY: test-vvv
test-vvv:
	$(FORGE) test -vvv

.PHONY: test-match
test-match:
	@[ "$(F)" ] || (echo "Usage: make test-match F=<test_name>" && exit 1)
	$(FORGE) test --match-test $(F) -vvv

.PHONY: clean
clean:
	@echo "$(BOLD)Cleaning build artifacts…$(RESET)"
	$(FORGE) clean
	rm -f deployment.env

.PHONY: snapshot
snapshot:
	$(FORGE) snapshot

.PHONY: size
size:
	$(FORGE) build --sizes

# -----------------------------------------------------------------------------
#  Local — Anvil
# -----------------------------------------------------------------------------

.PHONY: anvil
anvil:
	@echo "$(BOLD)$(CYAN)Starting Anvil on $(LOCAL_RPC)…$(RESET)"
	anvil --chain-id $(LOCAL_CHAIN_ID) --block-time 1

.PHONY: deploy-local
deploy-local:
	@echo "$(BOLD)$(GREEN)Deploying to local Anvil…$(RESET)"
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(LOCAL_RPC) \
		--private-key $(LOCAL_KEY) \
		--broadcast \
		-vvv
	@echo ""
	@echo "$(GREEN)✓ Local deploy complete.$(RESET)"
	@[ -f deployment.env ] && cat deployment.env || true

# -----------------------------------------------------------------------------
#  Base Sepolia
# -----------------------------------------------------------------------------

.PHONY: _check-sepolia
_check-sepolia:
	@[ "$(DEPLOYER_PRIVATE_KEY)" ] || (echo "$(RED)Error: DEPLOYER_PRIVATE_KEY not set$(RESET)" && exit 1)
	@[ "$(BASE_SEPOLIA_RPC_URL)"  ] || (echo "$(RED)Error: BASE_SEPOLIA_RPC_URL not set$(RESET)" && exit 1)

.PHONY: deploy-sepolia
deploy-sepolia: _check-sepolia
	@echo "$(BOLD)$(GREEN)Deploying to Base Sepolia…$(RESET)"
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(BASE_SEPOLIA_RPC_URL) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		-vvv
	@echo ""
	@echo "$(GREEN)✓ Sepolia deploy complete.$(RESET)"
	@[ -f deployment.env ] && cat deployment.env || true

.PHONY: deploy-sepolia-verify
deploy-sepolia-verify: _check-sepolia
	@[ "$(BASESCAN_API_KEY)" ] || (echo "$(RED)Error: BASESCAN_API_KEY not set$(RESET)" && exit 1)
	@echo "$(BOLD)$(GREEN)Deploying + verifying on Base Sepolia…$(RESET)"
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(BASE_SEPOLIA_RPC_URL) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		--verify \
		--etherscan-api-key $(BASESCAN_API_KEY) \
		-vvv
	@echo ""
	@echo "$(GREEN)✓ Sepolia deploy + verify complete.$(RESET)"
	@[ -f deployment.env ] && cat deployment.env || true

# -----------------------------------------------------------------------------
#  Base Mainnet
# -----------------------------------------------------------------------------

.PHONY: _check-mainnet
_check-mainnet:
	@[ "$(DEPLOYER_PRIVATE_KEY)"  ] || (echo "$(RED)Error: DEPLOYER_PRIVATE_KEY not set$(RESET)" && exit 1)
	@[ "$(BASE_MAINNET_RPC_URL)"  ] || (echo "$(RED)Error: BASE_MAINNET_RPC_URL not set$(RESET)" && exit 1)
	@echo "$(YELLOW)$(BOLD)⚠  You are about to deploy to BASE MAINNET.$(RESET)"
	@echo "$(YELLOW)   Press Ctrl+C within 5 seconds to abort.$(RESET)"
	@sleep 5

.PHONY: deploy-mainnet
deploy-mainnet: _check-mainnet
	@echo "$(BOLD)$(GREEN)Deploying to Base Mainnet…$(RESET)"
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(BASE_MAINNET_RPC_URL) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		-vvv
	@echo ""
	@echo "$(GREEN)✓ Mainnet deploy complete.$(RESET)"
	@[ -f deployment.env ] && cat deployment.env || true

.PHONY: deploy-mainnet-verify
deploy-mainnet-verify: _check-mainnet
	@[ "$(BASESCAN_API_KEY)" ] || (echo "$(RED)Error: BASESCAN_API_KEY not set$(RESET)" && exit 1)
	@echo "$(BOLD)$(GREEN)Deploying + verifying on Base Mainnet…$(RESET)"
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(BASE_MAINNET_RPC_URL) \
		--private-key $(DEPLOYER_PRIVATE_KEY) \
		--broadcast \
		--verify \
		--etherscan-api-key $(BASESCAN_API_KEY) \
		-vvv
	@echo ""
	@echo "$(GREEN)✓ Mainnet deploy + verify complete.$(RESET)"
	@[ -f deployment.env ] && cat deployment.env || true

# -----------------------------------------------------------------------------
#  Utilities
# -----------------------------------------------------------------------------

.PHONY: wallet
wallet:
	@echo "$(BOLD)Generating new wallet…$(RESET)"
	cast wallet new

.PHONY: balance
balance: _check-sepolia
	@ADDR=$$(cast wallet address --private-key $(DEPLOYER_PRIVATE_KEY)); \
	echo "$(BOLD)Address:$(RESET) $$ADDR"; \
	echo "$(BOLD)Balance (Base Sepolia):$(RESET)"; \
	cast balance $$ADDR --rpc-url $(BASE_SEPOLIA_RPC_URL) --ether

.PHONY: balance-mainnet
balance-mainnet:
	@[ "$(DEPLOYER_PRIVATE_KEY)" ]  || (echo "$(RED)Error: DEPLOYER_PRIVATE_KEY not set$(RESET)" && exit 1)
	@[ "$(BASE_MAINNET_RPC_URL)"  ] || (echo "$(RED)Error: BASE_MAINNET_RPC_URL not set$(RESET)" && exit 1)
	@ADDR=$$(cast wallet address --private-key $(DEPLOYER_PRIVATE_KEY)); \
	echo "$(BOLD)Address:$(RESET) $$ADDR"; \
	echo "$(BOLD)Balance (Base Mainnet):$(RESET)"; \
	cast balance $$ADDR --rpc-url $(BASE_MAINNET_RPC_URL) --ether
