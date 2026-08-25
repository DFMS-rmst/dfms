const { expect } = require('chai');
const { ethers } = require('hardhat');
describe('CertificateRegistry', function () {
  it('anchors a certificate hash once', async function () {
    const registry = await ethers.deployContract('CertificateRegistry');
    const recordIdHash = ethers.sha256(ethers.toUtf8Bytes('certificate-1'));
    const contentHash = ethers.sha256(ethers.toUtf8Bytes('canonical-payload'));
    await registry.anchorCertificate(recordIdHash, contentHash);
    expect((await registry.getAnchor(recordIdHash)).contentHash).to.equal(contentHash);
    await expect(
      registry.anchorCertificate(recordIdHash, contentHash),
    ).to.be.revertedWithCustomError(registry, 'AlreadyAnchored');
  });
});
