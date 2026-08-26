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
  it('rejects unauthorized anchorers and permits an owner-authorized anchorer', async function () {
    const [owner, other] = await ethers.getSigners();
    const registry = await ethers.deployContract('CertificateRegistry');
    const id = ethers.sha256(ethers.toUtf8Bytes('certificate-2'));
    const hash = ethers.sha256(ethers.toUtf8Bytes('payload-2'));
    await expect(registry.connect(other).anchorCertificate(id, hash)).to.be.revertedWithCustomError(
      registry,
      'Unauthorized',
    );
    await registry.connect(owner).setAnchorer(other.address, true);
    await registry.connect(other).anchorCertificate(id, hash);
    expect((await registry.getAnchor(id)).issuer).to.equal(other.address);
  });
  it('returns an empty proof for an unknown certificate', async function () {
    const registry = await ethers.deployContract('CertificateRegistry');
    const anchor = await registry.getAnchor(ethers.sha256(ethers.toUtf8Bytes('missing')));
    expect(anchor.contentHash).to.equal(ethers.ZeroHash);
    expect(anchor.anchoredAt).to.equal(0);
  });
  it('rejects zero identifiers and content hashes', async function () {
    const registry = await ethers.deployContract('CertificateRegistry');
    const id = ethers.sha256(ethers.toUtf8Bytes('certificate-3'));
    await expect(registry.anchorCertificate(ethers.ZeroHash, id)).to.be.revertedWithCustomError(
      registry,
      'InvalidHash',
    );
    await expect(registry.anchorCertificate(id, ethers.ZeroHash)).to.be.revertedWithCustomError(
      registry,
      'InvalidHash',
    );
  });
});
