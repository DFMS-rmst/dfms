import argon2 from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessToken } from '../../common/auth.js';
import { prisma } from '../../infrastructure/prisma/client.js';

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const app = createApp();

let farmerUser;
let dairyUser;
let dairyProfile;
let farm;
let animal;
let createdEnrollmentId;

describe.sequential('Fast Daily Milk Collection Flow & Vet Animal Lookup', () => {
  beforeAll(async () => {
    const passwordHash = await argon2.hash('SecurePass!123');

    // 1. Create Farmer User & Farm
    farmerUser = await prisma.user.create({
      data: {
        email: `fastfarmer-${stamp}@test.local`,
        fullName: `Ramesh Farmer ${stamp}`,
        passwordHash,
      },
    });

    farm = await prisma.farm.create({
      data: {
        name: `Green Meadows Farm ${stamp}`,
        state: 'Maharashtra',
        district: 'Kolhapur',
        status: 'ACTIVE',
        createdById: farmerUser.id,
      },
    });

    await prisma.farmerProfile.create({
      data: {
        userId: farmerUser.id,
        farmName: farm.name,
        farmerIdNumber: `FMR-TEST-${stamp.slice(0, 6).toUpperCase()}`,
        state: 'Maharashtra',
        district: 'Kolhapur',
        status: 'VERIFIED',
      },
    });

    // Create an animal for the vet lookup test
    const species = await prisma.species.findFirst({ where: { canonicalName: 'Cattle' } }) ||
      await prisma.species.findFirst();

    animal = await prisma.animal.create({
      data: {
        farmId: farm.id,
        speciesId: species.id,
        tagNumber: `TAG-VET-${stamp.slice(0, 6).toUpperCase()}`,
        name: 'Gauri Cow',
        sex: 'FEMALE',
        lactating: true,
        verificationId: `anm_test_${stamp.slice(0, 8)}`,
        status: 'ACTIVE',
      },
    });

    // 2. Create Dairy Operator User & Profile
    dairyUser = await prisma.user.create({
      data: {
        email: `fastdairy-${stamp}@test.local`,
        fullName: `Dairy Cooperative ${stamp}`,
        passwordHash,
        platformRoles: {
          create: [{ role: 'DAIRY_OWNER' }],
        },
      },
    });

    dairyProfile = await prisma.dairyOwnerProfile.create({
      data: {
        userId: dairyUser.id,
        dairyName: `Shree Krishna Dairy ${stamp}`,
        fssaiLicenseNumber: `FSSAI-FAST-${stamp.slice(0, 8)}`,
        state: 'Maharashtra',
        district: 'Kolhapur',
        operationalArea: 'Kolhapur North',
        dailyCapacityLiters: 30000,
        status: 'VERIFIED',
      },
    });
  });

  afterAll(async () => {
    if (createdEnrollmentId) {
      await prisma.$executeRawUnsafe(
        'DELETE FROM `dairy_milk_intakes` WHERE `enrollmentId` = ?',
        createdEnrollmentId,
      );
      await prisma.$executeRawUnsafe(
        'DELETE FROM `dairy_farmer_enrollments` WHERE `id` = ?',
        createdEnrollmentId,
      );
    }
    if (animal?.id) {
      await prisma.animal.deleteMany({ where: { id: animal.id } });
    }
    if (farm?.id) {
      await prisma.farmerProfile.deleteMany({ where: { userId: farmerUser.id } });
      await prisma.farm.deleteMany({ where: { id: farm.id } });
    }
    if (dairyProfile?.id) {
      await prisma.dairyOwnerProfile.deleteMany({ where: { userId: dairyUser.id } });
      await prisma.userPlatformRole.deleteMany({ where: { userId: dairyUser.id } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [farmerUser.id, dairyUser.id] } } });
  });

  // =========================================================================
  // PHASE 1: ENROLLMENT APIS
  // =========================================================================
  it('Phase 1A: Farmer submits join request via POST /api/enrollments', async () => {
    const farmerToken = signAccessToken(farmerUser.id);
    const res = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        dairyUserId: dairyUser.id,
        expectedDailyQuantity: 35.5,
        agreedRatePerLiter: 44.5,
        milkType: 'COW',
        baseFatPercentage: 4.2,
        baseSnfPercentage: 8.6,
        joinRequestNotes: 'Looking to supply fresh morning cow milk daily.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING_APPROVAL');
    expect(res.body.data.enrollmentId).toBeDefined();
    createdEnrollmentId = res.body.data.enrollmentId;

    // Verify record in database
    const rows = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `id` = ?',
      createdEnrollmentId,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('PENDING_APPROVAL');
    expect(Number(rows[0].expectedDailyQuantity)).toBe(35.5);
    expect(Number(rows[0].agreedRatePerLiter)).toBe(44.5);
  });

  it('Phase 2 Pre-Check: GET /api/milk-collection/validate-farmer returns 403 when status is PENDING_APPROVAL', async () => {
    const dairyToken = signAccessToken(dairyUser.id);
    const farmerProfile = await prisma.farmerProfile.findFirst({ where: { userId: farmerUser.id } });

    const res = await request(app)
      .get(`/api/milk-collection/validate-farmer?dairyUserId=${dairyUser.id}&farmerIdNumber=${farmerProfile.farmerIdNumber}`)
      .set('Authorization', `Bearer ${dairyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ENROLLMENT_NOT_ACTIVE');
  });

  it('Phase 1B: Dairy operator approves join request via PUT /api/enrollments/:id/status', async () => {
    const dairyToken = signAccessToken(dairyUser.id);
    const res = await request(app)
      .put(`/api/enrollments/${createdEnrollmentId}/status`)
      .set('Authorization', `Bearer ${dairyToken}`)
      .send({
        status: 'ACTIVE',
        agreedRatePerLiter: 45.0, // slight bump upon agreement
        notes: 'Terms approved. Active daily supplier.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.agreedRatePerLiter).toBe(45.0);

    // Verify database status is now ACTIVE
    const rows = await prisma.$queryRawUnsafe(
      'SELECT status, agreedRatePerLiter FROM `dairy_farmer_enrollments` WHERE `id` = ?',
      createdEnrollmentId,
    );
    expect(rows[0].status).toBe('ACTIVE');
    expect(Number(rows[0].agreedRatePerLiter)).toBe(45.0);
  });

  // =========================================================================
  // PHASE 2: DAILY COLLECTION FAST-FLOW APIS
  // =========================================================================
  it('Phase 2A: Validates farmer via GET /api/milk-collection/validate-farmer and returns required DTO', async () => {
    const dairyToken = signAccessToken(dairyUser.id);
    const farmerProfile = await prisma.farmerProfile.findFirst({ where: { userId: farmerUser.id } });

    const res = await request(app)
      .get(`/api/milk-collection/validate-farmer?dairyUserId=${dairyUser.id}&farmerIdNumber=${farmerProfile.farmerIdNumber}`)
      .set('Authorization', `Bearer ${dairyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.enrollmentId).toBe(createdEnrollmentId);
    expect(res.body.data.farmerName).toBe(`Ramesh Farmer ${stamp}`);
    expect(res.body.data.expectedDailyQuantity).toBe(35.5);
    expect(res.body.data.agreedRatePerLiter).toBe(45.0);
    expect(res.body.data.baseFatPercentage).toBe(4.2);
    expect(res.body.data.baseSnfPercentage).toBe(8.6);
  });

  it('Phase 2B: Records daily fast intake via POST /api/milk-collection/intake with default values', async () => {
    const dairyToken = signAccessToken(dairyUser.id);
    const farmerProfile = await prisma.farmerProfile.findFirst({ where: { userId: farmerUser.id } });

    const res = await request(app)
      .post('/api/milk-collection/intake')
      .set('Authorization', `Bearer ${dairyToken}`)
      .send({
        dairyUserId: dairyUser.id,
        enrollmentId: createdEnrollmentId,
        farmerIdNumber: farmerProfile.farmerIdNumber,
        farmerName: `Ramesh Farmer ${stamp}`,
        collectionDate: new Date().toISOString().split('T')[0],
        shift: 'MORNING',
        milkType: 'COW',
        quantityLiters: 30.0,
        fatPercentage: 4.3,
        snfPercentage: 8.7,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.intakeId).toBeDefined();
    expect(res.body.data.ratePerLiter).toBe(45.0); // from enrollment
    expect(res.body.data.totalCost).toBe(1350.0); // 30.0 * 45.0
    expect(res.body.data.storageTank).toBe('Silo-1');
    expect(res.body.data.eligibilityStatus).toBe('CLEARED');
    expect(res.body.data.paymentStatus).toBe('PENDING');
    expect(res.body.data.qualityGrade).toBe('GRADE_A');

    // Verify insertion in database
    const intakeRows = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_milk_intakes` WHERE `id` = ?',
      res.body.data.intakeId,
    );
    expect(intakeRows).toHaveLength(1);
    const intake = intakeRows[0];
    expect(intake.storageTank).toBe('Silo-1');
    expect(intake.eligibilityStatus).toBe('CLEARED');
    expect(intake.paymentStatus).toBe('PENDING');
    expect(intake.qualityGrade).toBe('GRADE_A');
    expect(Number(intake.totalCost)).toBe(1350.0);
  });

  // =========================================================================
  // VETERINARIAN ANIMAL LOOKUP API
  // =========================================================================
  it('Vet Section: GET /api/v1/veterinarians/animals/lookup returns animal clinical history', async () => {
    const vetToken = signAccessToken(dairyUser.id); // any authenticated user

    const res = await request(app)
      .get(`/api/v1/veterinarians/animals/lookup?query=${animal.tagNumber}`)
      .set('Authorization', `Bearer ${vetToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.animal).toBeDefined();
    expect(res.body.data.animal.tagNumber).toBe(animal.tagNumber);
    expect(res.body.data.animal.name).toBe('Gauri Cow');
    expect(res.body.data.diagnoses).toBeDefined();
    expect(res.body.data.prescriptions).toBeDefined();
    expect(res.body.data.treatments).toBeDefined();
  });
});
