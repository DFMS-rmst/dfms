import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { importReferenceData } from './import-reference.js';
import { evaluateAndPersist } from '../src/modules/withdrawal/service.js';
import { issueCertificate } from '../src/modules/certificates/service.js';

const prisma = new PrismaClient();
await importReferenceData(prisma);

if (process.env.SEED_DEMO_DATA === 'true') {
  const passwordHash = await argon2.hash('DemoOnly!234', { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.local' },
    create: {
      email: 'admin@example.local',
      fullName: 'Demo Platform Admin',
      passwordHash,
      platformRoles: { create: { role: 'PLATFORM_ADMIN' } },
    },
    update: {},
  });
  const owner = await prisma.user.upsert({
    where: { email: 'farmer@example.local' },
    create: { email: 'farmer@example.local', fullName: 'Demo Farm Owner', passwordHash },
    update: {},
  });
  const vet = await prisma.user.upsert({
    where: { email: 'vet@example.local' },
    create: { email: 'vet@example.local', fullName: 'Dr Demo Veterinarian', passwordHash },
    update: {},
  });
  const existingFarm = await prisma.farm.findFirst({
    where: { name: 'SIH Demonstration Dairy', createdById: owner.id },
  });
  if (!existingFarm) {
    const species = await prisma.species.findUniqueOrThrow({ where: { code: 'BOS_TAURUS' } });
    const drug = await prisma.drug.findUniqueOrThrow({ where: { code: 'AMOXICILLIN' } });
    const product = await prisma.drugProduct.findFirstOrThrow({
      where: { sourceRecordId: 'EU-700000186534' },
    });
    const disease = await prisma.disease.findUnique({ where: { code: 'COND-MASTITIS-CLINICAL' } });
    const vetProfile = await prisma.veterinarianProfile.upsert({
      where: { userId: vet.id },
      create: {
        userId: vet.id,
        registrationNumber: 'DEMO-VET-001',
        registrationCouncil: 'Demonstration Council (local data only)',
        qualification: 'B.V.Sc. & A.H. — demonstration profile',
        specialization: 'Bovine medicine',
        experienceYears: 8,
        status: 'VERIFIED',
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNotes: 'Local demonstration verification; not government certification.',
        serviceAreas: { create: { state: 'Karnataka', district: 'Mysuru' } },
      },
      update: {},
    });
    const farm = await prisma.farm.create({
      data: {
        name: 'SIH Demonstration Dairy',
        status: 'ACTIVE',
        state: 'Karnataka',
        district: 'Mysuru',
        regulatoryJurisdiction: 'IRELAND',
        demonstrationMode: true,
        createdById: owner.id,
        members: {
          create: {
            userId: owner.id,
            status: 'ACTIVE',
            joinedAt: new Date(),
            roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
          },
        },
      },
    });
    const eligibleAnimal = await prisma.animal.create({
      data: {
        farmId: farm.id,
        speciesId: species.id,
        tagNumber: 'DEMO-COW-ELIGIBLE',
        sex: 'FEMALE',
        lactating: true,
      },
    });
    const blockedAnimal = await prisma.animal.create({
      data: {
        farmId: farm.id,
        speciesId: species.id,
        tagNumber: 'DEMO-COW-RULE-MISSING',
        sex: 'FEMALE',
        lactating: true,
      },
    });
    const completedAt = new Date(Date.now() - 4 * 86_400_000);
    async function createClinicalStory(animal, withExactProduct) {
      const treatmentRequest = await prisma.treatmentRequest.create({
        data: {
          farmId: farm.id,
          animalId: animal.id,
          requestedVeterinarianId: vetProfile.id,
          createdById: owner.id,
          observations: 'Reduced appetite and udder discomfort observed by farmer.',
          symptoms: 'Visible swelling; veterinarian assessment requested.',
          urgency: 'SOON',
          status: 'COMPLETED',
          respondedAt: completedAt,
        },
      });
      const veterinaryCase = await prisma.veterinaryCase.create({
        data: {
          requestId: treatmentRequest.id,
          farmId: farm.id,
          animalId: animal.id,
          veterinarianId: vetProfile.id,
          status: 'COMPLETED',
          openedAt: new Date(completedAt.getTime() - 4 * 86_400_000),
          completedAt,
          messages: {
            create: [
              { senderId: owner.id, body: 'Please review the recorded symptoms.' },
              { senderId: vet.id, body: 'Clinical visit completed; structured records follow.' },
            ],
          },
        },
      });
      const diagnosis = await prisma.diagnosis.create({
        data: {
          caseId: veterinaryCase.id,
          animalId: animal.id,
          veterinarianId: vetProfile.id,
          diseaseId: disease?.id,
          clinicalNotes: 'Demonstration veterinarian-entered clinical assessment.',
          diagnosedAt: new Date(completedAt.getTime() - 3 * 86_400_000),
        },
      });
      const prescription = await prisma.prescription.create({
        data: {
          caseId: veterinaryCase.id,
          animalId: animal.id,
          veterinarianId: vetProfile.id,
          diagnosisId: diagnosis.id,
          instructions: 'Demonstration transactional instruction; not a dosage recommendation.',
          startDate: new Date(completedAt.getTime() - 3 * 86_400_000),
          expectedEndDate: completedAt,
          items: {
            create: {
              drugId: drug.id,
              drugProductId: withExactProduct ? product.id : null,
              doseValue: 1,
              doseUnit: 'recorded-unit',
              route: 'INTRAMUSCULAR',
              frequency: 'As veterinarian recorded for demonstration',
              durationValue: 1,
              durationUnit: 'recorded-course',
              startDate: new Date(completedAt.getTime() - 3 * 86_400_000),
            },
          },
        },
        include: { items: true },
      });
      const treatment = await prisma.treatment.create({
        data: {
          caseId: veterinaryCase.id,
          animalId: animal.id,
          farmId: farm.id,
          veterinarianId: vetProfile.id,
          prescriptionId: prescription.id,
          status: 'COMPLETED',
          startedAt: new Date(completedAt.getTime() - 3 * 86_400_000),
          completedAt,
          notes: 'Deterministic local demonstration transaction.',
        },
      });
      await prisma.treatmentAdministration.create({
        data: {
          treatmentId: treatment.id,
          prescriptionItemId: prescription.items[0].id,
          animalId: animal.id,
          drugId: drug.id,
          drugProductId: withExactProduct ? product.id : null,
          administeredById: vet.id,
          amount: 1,
          amountUnit: 'recorded-unit',
          route: 'INTRAMUSCULAR',
          administeredAt: completedAt,
          notes:
            'Actual demonstration administration; value is transactional, not reference dosage.',
        },
      });
      return treatment;
    }
    await createClinicalStory(eligibleAnimal, true);
    await createClinicalStory(blockedAnimal, false);
    await prisma.auditLog.createMany({
      data: [
        {
          actorUserId: admin.id,
          action: 'VETERINARIAN_VERIFIED',
          entityType: 'VeterinarianProfile',
          entityId: vetProfile.id,
        },
        {
          actorUserId: owner.id,
          action: 'DEMO_FARM_CREATED',
          entityType: 'Farm',
          entityId: farm.id,
          farmId: farm.id,
        },
      ],
    });
    await evaluateAndPersist(eligibleAnimal.id, 'DEMO_SEED', owner.id);
    await evaluateAndPersist(blockedAnimal.id, 'DEMO_SEED', owner.id);
    const issued = await issueCertificate(eligibleAnimal.id, owner.id);
    const deterministicPayload = {
      ...issued.certificate.canonicalPayload,
      certificateNumber: 'MEC-DEMO-0001',
    };
    const { hashCertificatePayload } = await import('../src/modules/certificates/canonical.js');
    await prisma.milkEligibilityCertificate.update({
      where: { id: issued.certificate.id },
      data: {
        certificateNumber: 'MEC-DEMO-0001',
        verificationId: 'demo-certificate-verification-0001',
        canonicalPayload: deterministicPayload,
        contentHashSha256: hashCertificatePayload(deterministicPayload),
      },
    });
  }
  const demoCertificate = await prisma.milkEligibilityCertificate.findFirst({
    where: { animal: { tagNumber: 'DEMO-COW-ELIGIBLE', farm: { createdById: owner.id } } },
  });
  if (demoCertificate) {
    const demonstrationDisclaimer =
      'This certificate represents milk eligibility based on recorded treatment history and configured withdrawal-period reference rules. It does not represent laboratory residue testing. DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE';
    const deterministicPayload = {
      ...demoCertificate.canonicalPayload,
      certificateNumber: 'MEC-DEMO-0001',
      regulatoryContext: {
        jurisdiction: 'IRELAND',
        demonstrationMode: true,
        warning: 'DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE',
      },
      disclaimer: demonstrationDisclaimer,
    };
    const { hashCertificatePayload } = await import('../src/modules/certificates/canonical.js');
    await prisma.milkEligibilityCertificate.update({
      where: { id: demoCertificate.id },
      data: {
        certificateNumber: 'MEC-DEMO-0001',
        verificationId: 'demo-certificate-verification-0001',
        canonicalPayload: deterministicPayload,
        contentHashSha256: hashCertificatePayload(deterministicPayload),
        disclaimer: demonstrationDisclaimer,
      },
    });
  }
}
await prisma.$disconnect();
