# AIRDROP_ADDRESS := 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
# TOKEN_ADDRESS := 0x5FbDB2315678afecb367f032d93F642f64180aa3
-include .env




DEFAULT_ANVIL_KEY := 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97


deploy:
	@forge script script/DeployScript.s.sol:DeployScript $(NETWORK_ARGS)

NETWORK_ARGS := --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY) --broadcast