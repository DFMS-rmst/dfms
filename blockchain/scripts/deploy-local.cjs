const hre = require('hardhat');

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (hre.network.name !== 'localhost' || network.chainId !== 31337n) {
    throw new Error('Local deployment is restricted to the disposable Hardhat chain (31337)');
  }

  const registry = await hre.ethers.deployContract('CertificateRegistry');
  await registry.waitForDeployment();
  const deployment = registry.deploymentTransaction();

  console.log(`Deployed contract address: ${await registry.getAddress()}`);
  console.log(`Deployment transaction hash: ${deployment.hash}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
