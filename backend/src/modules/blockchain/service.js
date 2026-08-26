import { ethers } from 'ethers';
import { env } from '../../config/env.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { createAlerts } from '../alerts/service.js';
import { appendAudit } from '../audit/index.js';
import { hashCertificatePayload } from '../certificates/canonical.js';

const ABI = [
  'function anchorCertificate(bytes32 recordIdHash, bytes32 contentHash)',
  'function getAnchor(bytes32 recordIdHash) view returns ((bytes32 contentHash,uint64 anchoredAt,address issuer))',
];

function defaultAdapter() {
  if (!env.BLOCKCHAIN_RPC_URL || !env.BLOCKCHAIN_PRIVATE_KEY || !env.BLOCKCHAIN_CONTRACT_ADDRESS)
    throw Object.assign(new Error('Blockchain connection is not configured'), {
      code: 'BLOCKCHAIN_NOT_CONFIGURED',
    });
  const provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
  const signer = new ethers.Wallet(env.BLOCKCHAIN_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(env.BLOCKCHAIN_CONTRACT_ADDRESS, ABI, signer);
  return {
    async anchor(id, hash) {
      const network = await provider.getNetwork();
      const tx = await contract.anchorCertificate(
        ethers.sha256(ethers.toUtf8Bytes(id)),
        `0x${hash}`,
      );
      const receipt = await tx.wait();
      return {
        chainId: String(network.chainId),
        contractAddress: env.BLOCKCHAIN_CONTRACT_ADDRESS,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
      };
    },
    async read(id) {
      return contract.getAnchor(ethers.sha256(ethers.toUtf8Bytes(id)));
    },
  };
}

async function notify(client, certificate, type, message, suffix) {
  const members = await client.farmMember.findMany({
    where: { farmId: certificate.farmId, status: 'ACTIVE' },
    select: { userId: true },
  });
  await createAlerts(
    client,
    members.map((item) => item.userId),
    {
      farmId: certificate.farmId,
      type,
      title:
        type === 'BLOCKCHAIN_ANCHOR_SUCCEEDED'
          ? 'Certificate proof anchored'
          : 'Certificate proof needs retry',
      message,
      entityType: 'MilkEligibilityCertificate',
      entityId: certificate.id,
      dedupKeyPrefix: `certificate:${certificate.id}:${suffix}`,
    },
  );
}

export async function anchorCertificate(certificateId, actorUserId, adapter = null) {
  const certificate = await prisma.milkEligibilityCertificate.findUnique({
    where: { id: certificateId },
  });
  if (!certificate) return null;
  let anchor = await prisma.blockchainAnchor.upsert({
    where: {
      recordType_recordId_contentHash: {
        recordType: 'MILK_ELIGIBILITY_CERTIFICATE',
        recordId: certificate.id,
        contentHash: certificate.contentHashSha256,
      },
    },
    create: {
      recordType: 'MILK_ELIGIBILITY_CERTIFICATE',
      recordId: certificate.id,
      contentHash: certificate.contentHashSha256,
      status: 'PENDING',
    },
    update: {},
  });
  if (anchor.status === 'ANCHORED') return anchor;
  await appendAudit({
    actorUserId,
    action: anchor.attemptCount ? 'BLOCKCHAIN_ANCHOR_RETRIED' : 'BLOCKCHAIN_ANCHOR_SUBMITTED',
    entityType: 'BlockchainAnchor',
    entityId: anchor.id,
    farmId: certificate.farmId,
  });
  try {
    const result = await (adapter || defaultAdapter()).anchor(
      certificate.id,
      certificate.contentHashSha256,
    );
    anchor = await prisma.blockchainAnchor.update({
      where: { id: anchor.id },
      data: {
        ...result,
        status: 'ANCHORED',
        attemptCount: { increment: 1 },
        anchoredAt: new Date(),
        lastErrorCode: null,
      },
    });
    await notify(
      prisma,
      certificate,
      'BLOCKCHAIN_ANCHOR_SUCCEEDED',
      `Integrity proof for ${certificate.certificateNumber} was anchored.`,
      `anchor:${anchor.id}:success`,
    );
    await appendAudit({
      actorUserId,
      action: 'BLOCKCHAIN_ANCHOR_SUCCEEDED',
      entityType: 'BlockchainAnchor',
      entityId: anchor.id,
      farmId: certificate.farmId,
      newData: {
        transactionHash: anchor.transactionHash,
        blockNumber: anchor.blockNumber == null ? null : String(anchor.blockNumber),
      },
    });
    return anchor;
  } catch (error) {
    anchor = await prisma.blockchainAnchor.update({
      where: { id: anchor.id },
      data: {
        status: 'FAILED',
        attemptCount: { increment: 1 },
        lastErrorCode: error.code || 'BLOCKCHAIN_ERROR',
      },
    });
    await notify(
      prisma,
      certificate,
      'BLOCKCHAIN_ANCHOR_FAILED',
      `Integrity proof for ${certificate.certificateNumber} could not be anchored and may be retried.`,
      `anchor:${anchor.id}:failed:${anchor.attemptCount}`,
    );
    await appendAudit({
      actorUserId,
      action: 'BLOCKCHAIN_ANCHOR_FAILED',
      entityType: 'BlockchainAnchor',
      entityId: anchor.id,
      farmId: certificate.farmId,
      newData: { errorCode: anchor.lastErrorCode },
    });
    return anchor;
  }
}

export async function verifyCertificateIntegrity(certificate, adapter = null) {
  const recomputed = hashCertificatePayload(certificate.canonicalPayload);
  if (recomputed !== certificate.contentHashSha256) return { status: 'TAMPERED' };
  const anchor = await prisma.blockchainAnchor.findUnique({
    where: {
      recordType_recordId_contentHash: {
        recordType: 'MILK_ELIGIBILITY_CERTIFICATE',
        recordId: certificate.id,
        contentHash: certificate.contentHashSha256,
      },
    },
  });
  if (!anchor || anchor.status === 'PENDING')
    return { status: 'NOT_ANCHORED', anchor: anchor || null };
  if (anchor.status === 'FAILED') return { status: 'VERIFICATION_ERROR', anchor };
  try {
    const onChain = await (adapter || defaultAdapter()).read(certificate.id);
    return {
      status:
        String(onChain.contentHash).toLowerCase() === `0x${recomputed}` ? 'VERIFIED' : 'TAMPERED',
      anchor,
    };
  } catch {
    return { status: 'VERIFICATION_ERROR', anchor };
  }
}
