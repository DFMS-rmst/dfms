# Local CertificateRegistry deployment

This deployment is only for Hardhat's disposable local chain. It does not use MetaMask, a public network, or a hard-coded private key.

From the repository root, start the node and leave it running:

```powershell
npm run node --workspace blockchain
```

In another terminal, deploy the existing `CertificateRegistry` contract:

```powershell
npm run deploy:local --workspace blockchain
```

The command prints the contract address, deployment transaction hash, network, and chain ID. Configure the ignored local backend environment with placeholders replaced by values from this disposable session:

```env
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=<DISPOSABLE_HARDHAT_PRIVATE_KEY>
BLOCKCHAIN_CONTRACT_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>
BLOCKCHAIN_NETWORK=hardhat-local
```

Restarting the Hardhat node removes the deployed contract and all anchors, so redeploy and refresh the local backend configuration after a restart.
