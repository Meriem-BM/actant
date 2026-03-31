-include .env
export

FORGE  := forge
SCRIPT := script/Deploy.s.sol

.PHONY: build test clean

build:
	$(FORGE) build

test:
	$(FORGE) test

clean:
	$(FORGE) clean

# Local (Anvil)
deploy-local:
	$(FORGE) script $(SCRIPT) \
		--rpc-url http://127.0.0.1:8545 \
		--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
		--broadcast

# Base Sepolia
deploy-sepolia:
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(BASE_SEPOLIA_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY)

# Base Mainnet
deploy-mainnet:
	$(FORGE) script $(SCRIPT) \
		--rpc-url $(BASE_MAINNET_RPC_URL) \
		--private-key $(PRIVATE_KEY) \
		--broadcast \
		--verify \
		--etherscan-api-key $(ETHERSCAN_API_KEY)
