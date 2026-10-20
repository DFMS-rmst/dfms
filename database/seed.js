/**
 * DFMS Seed Script — inserts admin users + demo data using mysql2.
 *
 * Run:  node database/seed.js
 *
 * Reads reference JSON data from  data/reference/*.json
 * and inserts them into the already-created dfms_livestock database.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const cuid = () => 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
const referenceUrl = (name) => new URL(`../data/reference/${name}.json`, import.meta.url);
const read = async (name) => JSON.parse(await fs.readFile(referenceUrl(name), 'utf8'));
const toDate = (v) => (v ? `${v}T00:00:00.000Z` : null);
const mapStatus = (v) => {
  if (v === 'EXAMPLE_ONLY' || v?.includes('FOREIGN_JURISDICTION')) return 'EXAMPLE_ONLY';
  if (v === 'NOT_AVAILABLE') return 'NOT_AVAILABLE';
  if (v === 'RULE_NOT_FOUND') return 'RULE_NOT_FOUND';
  if (v === 'CONFLICTING_SOURCE') return 'CONFLICTING_SOURCE';
  if (v?.startsWith('VERIFIED') && !v.includes('REVIEW')) return 'VERIFIED';
  return 'REVIEW_REQUIRED';
};

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = mysql.createPool({ uri: DB_URL, waitForConnections: true, connectionLimit: 5 });

async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function qOne(sql, params = []) {
  const rows = await q(sql, params);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertUser(email, fullName, passwordHash) {
  const existing = await qOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    await q('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, existing.id]);
    return existing.id;
  }
  const id = cuid();
  await q(
    'INSERT INTO users (id, email, full_name, password_hash, status) VALUES (?, ?, ?, ?, ?)',
    [id, email, fullName, passwordHash, 'ACTIVE'],
  );
  return id;
}

async function ensurePlatformRole(userId, role) {
  const existing = await qOne('SELECT id FROM user_platform_roles WHERE user_id = ? AND role = ?', [
    userId,
    role,
  ]);
  if (!existing) {
    await q('INSERT INTO user_platform_roles (id, user_id, role) VALUES (?, ?, ?)', [
      cuid(),
      userId,
      role,
    ]);
  }
}

// ──────────────────────────────────────────────────────────────
// REFERENCE DATA IMPORT
// ──────────────────────────────────────────────────────────────

async function importReferenceData() {
  console.log('Importing reference data...');
  const [
    sourceData,
    speciesData,
    classData,
    drugData,
    diseaseData,
    relationships,
    withdrawals,
    mrls,
  ] = await Promise.all([
    read('sources'),
    read('species'),
    read('antimicrobial_classes'),
    read('drugs'),
    read('diseases'),
    read('drug_species'),
    read('withdrawal_rules'),
    read('mrl_reference'),
  ]);

  // Sources
  for (const s of sourceData.records) {
    const existing = await qOne('SELECT id FROM regulatory_sources WHERE source_record_id = ?', [
      s.id,
    ]);
    if (existing) {
      await q('UPDATE regulatory_sources SET organization=?, title=?, url=? WHERE id=?', [
        s.organization,
        s.title,
        s.url,
        existing.id,
      ]);
    } else {
      await q(
        `INSERT INTO regulatory_sources (id, source_record_id, organization, title, url, jurisdiction, publication_date, effective_date, retrieval_date)
               VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          cuid(),
          s.id,
          s.organization,
          s.title,
          s.url,
          s.jurisdiction,
          toDate(s.publication_date),
          toDate(s.effective_date),
          toDate(sourceData.retrieval_date),
        ],
      );
    }
  }

  // Species
  for (const item of speciesData.records) {
    const code = item.id.replace('SP-', '').replaceAll('-', '_');
    const existing = await qOne('SELECT id FROM species WHERE code = ?', [code]);
    if (existing) {
      await q(
        'UPDATE species SET canonical_name=?, scientific_name=?, source_record_id=? WHERE id=?',
        [item.canonical_name, item.scientific_name, item.id, existing.id],
      );
    } else {
      await q(
        'INSERT INTO species (id, code, canonical_name, scientific_name, source_record_id) VALUES (?,?,?,?,?)',
        [cuid(), code, item.canonical_name, item.scientific_name, item.id],
      );
    }
  }

  // Antimicrobial classes
  for (const item of classData.records) {
    const existing = await qOne('SELECT id FROM antimicrobial_classes WHERE canonical_name = ?', [
      item.canonical_name,
    ]);
    if (existing) {
      await q('UPDATE antimicrobial_classes SET source_record_id=? WHERE id=?', [
        item.id,
        existing.id,
      ]);
    } else {
      await q(
        'INSERT INTO antimicrobial_classes (id, code, canonical_name, source_record_id) VALUES (?,?,?,?)',
        [cuid(), item.id, item.canonical_name, item.id],
      );
    }
  }

  // Build class lookup
  const classRows = await q('SELECT id, source_record_id FROM antimicrobial_classes');
  const classes = Object.fromEntries(classRows.map((x) => [x.source_record_id, x]));

  // Drugs
  for (const item of drugData.records) {
    const existing = await qOne('SELECT id FROM drugs WHERE canonical_name = ?', [
      item.canonical_name,
    ]);
    const amClassId = classes[item.class_id]?.id || null;
    const aliasesJson = item.aliases ? JSON.stringify(item.aliases) : null;
    if (existing) {
      await q(
        'UPDATE drugs SET aliases=?, source_record_id=?, antimicrobial_class_id=? WHERE id=?',
        [aliasesJson, item.id, amClassId, existing.id],
      );
    } else {
      await q(
        'INSERT INTO drugs (id, code, canonical_name, antimicrobial_class_id, aliases, source_record_id) VALUES (?,?,?,?,?,?)',
        [cuid(), item.id, item.canonical_name, amClassId, aliasesJson, item.id],
      );
    }
  }

  // Build lookups
  const drugRows = await q('SELECT id, source_record_id FROM drugs');
  const drugs = Object.fromEntries(drugRows.map((x) => [x.source_record_id, x]));
  const speciesRows = await q('SELECT id, source_record_id FROM species');
  const speciesMap = Object.fromEntries(speciesRows.map((x) => [x.source_record_id, x]));
  const sourceRows = await q('SELECT id, source_record_id FROM regulatory_sources');
  const sources = Object.fromEntries(sourceRows.map((x) => [x.source_record_id, x]));

  // Diseases
  for (const item of diseaseData.records) {
    const existing = await qOne('SELECT id FROM diseases WHERE code = ?', [item.id]);
    const relev = item.antimicrobial_relevance || 'VET_ASSESSMENT';
    if (existing) {
      await q(
        'UPDATE diseases SET canonical_name=?, antimicrobial_relevance=?, source_record_id=? WHERE id=?',
        [item.canonical_name, relev, item.id, existing.id],
      );
    } else {
      await q(
        'INSERT INTO diseases (id, code, canonical_name, antimicrobial_relevance, source_record_id) VALUES (?,?,?,?,?)',
        [cuid(), item.id, item.canonical_name, relev, item.id],
      );
    }
  }

  // Drug-Species relationships
  for (const item of relationships.records) {
    const drugId = drugs[item.drug_id]?.id;
    const specId = speciesMap[item.species_id]?.id;
    if (!drugId || !specId) continue;
    const existing = await qOne(
      'SELECT id FROM drug_species WHERE drug_id = ? AND species_id = ?',
      [drugId, specId],
    );
    if (existing) {
      await q('UPDATE drug_species SET status=? WHERE id=?', [item.status, existing.id]);
    } else {
      await q('INSERT INTO drug_species (id, drug_id, species_id, status) VALUES (?,?,?,?)', [
        cuid(),
        drugId,
        specId,
        item.status,
      ]);
    }
  }

  // Drug Products + Withdrawal Rules
  const productByRef = {};
  for (const rule of withdrawals.records) {
    if (!rule.product_id) continue;
    let product = await qOne('SELECT id FROM drug_products WHERE source_record_id = ?', [
      rule.product_id,
    ]);
    const drugId = drugs[rule.drug_ids[0]]?.id;
    if (!drugId) continue;
    if (product) {
      await q(
        `UPDATE drug_products SET drug_id=?, product_name=?, authorization_number=?,
               jurisdiction=?, formulation=?, route=? WHERE id=?`,
        [
          drugId,
          rule.product_name,
          rule.product_id,
          rule.jurisdiction,
          rule.formulation,
          rule.route,
          product.id,
        ],
      );
    } else {
      const pid = cuid();
      await q(
        `INSERT INTO drug_products (id, drug_id, product_name, authorization_number,
               jurisdiction, formulation, route, source_record_id) VALUES (?,?,?,?,?,?,?,?)`,
        [
          pid,
          drugId,
          rule.product_name,
          rule.product_id,
          rule.jurisdiction,
          rule.formulation,
          rule.route,
          rule.product_id,
        ],
      );
      product = { id: pid };
    }
    productByRef[rule.product_id] = product;
  }

  for (const rule of withdrawals.records) {
    for (const speciesId of rule.species_ids) {
      const code = rule.species_ids.length > 1 ? `${rule.id}-${speciesId}` : rule.id;
      const drugId = rule.drug_ids[0] ? drugs[rule.drug_ids[0]]?.id : null;
      const dpId = rule.product_id ? productByRef[rule.product_id]?.id : null;
      const specId = speciesMap[speciesId]?.id;
      const srcId = sources[rule.source_ids[0]]?.id;
      if (!specId || !srcId) continue;
      const existing = await qOne(
        'SELECT id FROM withdrawal_rules WHERE code = ? AND version = 1',
        [code],
      );
      const vals = [
        code,
        1,
        drugId,
        dpId,
        specId,
        rule.food_product,
        rule.route,
        rule.formulation || null,
        rule.use_conditions ? JSON.stringify(rule.use_conditions) : null,
        rule.duration.value,
        rule.duration.unit,
        rule.duration.qualifier,
        rule.jurisdiction,
        srcId,
        rule.source_section || null,
        toDate(rule.effective_date),
        mapStatus(rule.verification_status),
        rule.rule_type,
        rule.certificate_use || null,
      ];
      if (existing) {
        await q(
          `UPDATE withdrawal_rules SET drug_id=?, drug_product_id=?, species_id=?, food_product=?,
                 route=?, formulation=?, use_conditions=?, duration_value=?, duration_unit=?,
                 duration_qualifier=?, jurisdiction=?, source_id=?, source_section=?,
                 effective_from=?, verification_status=?, rule_type=?, certificate_use=?
                 WHERE id=?`,
          [
            drugId,
            dpId,
            specId,
            rule.food_product,
            rule.route,
            rule.formulation || null,
            rule.use_conditions ? JSON.stringify(rule.use_conditions) : null,
            rule.duration.value,
            rule.duration.unit,
            rule.duration.qualifier,
            rule.jurisdiction,
            srcId,
            rule.source_section || null,
            toDate(rule.effective_date),
            mapStatus(rule.verification_status),
            rule.rule_type,
            rule.certificate_use || null,
            existing.id,
          ],
        );
      } else {
        await q(
          `INSERT INTO withdrawal_rules (id, code, version, drug_id, drug_product_id, species_id,
                 food_product, route, formulation, use_conditions, duration_value, duration_unit,
                 duration_qualifier, jurisdiction, source_id, source_section, effective_from,
                 verification_status, rule_type, certificate_use) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [cuid(), ...vals],
        );
      }
    }
  }

  // MRL Reference Rules
  for (const item of mrls.records) {
    const drugId = drugs[item.drug_id]?.id;
    const specId = item.species_id ? speciesMap[item.species_id]?.id : null;
    const srcId = sources[item.source_ids[0]]?.id;
    if (!drugId || !srcId) continue;
    const existing = await qOne('SELECT id FROM mrl_reference_rules WHERE code = ?', [item.id]);
    if (existing) {
      await q(
        `UPDATE mrl_reference_rules SET drug_id=?, species_id=?, species_scope=?, food_product=?,
               value=?, unit=?, jurisdiction=?, source_id=?, verification_status=? WHERE id=?`,
        [
          drugId,
          specId,
          item.species_scope || null,
          item.food_product,
          item.value,
          item.unit,
          item.jurisdiction,
          srcId,
          mapStatus(item.verification_status),
          existing.id,
        ],
      );
    } else {
      await q(
        `INSERT INTO mrl_reference_rules (id, code, drug_id, species_id, species_scope,
               food_product, value, unit, jurisdiction, source_id, verification_status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          cuid(),
          item.id,
          drugId,
          specId,
          item.species_scope || null,
          item.food_product,
          item.value,
          item.unit,
          item.jurisdiction,
          srcId,
          mapStatus(item.verification_status),
        ],
      );
    }
  }

  console.log('Reference data imported.');
}

// ──────────────────────────────────────────────────────────────
// ADMIN & DEMO SEED
// ──────────────────────────────────────────────────────────────

async function seedAdminsAndDemo() {
  console.log('Seeding admin users...');

  // ── 4 Admin users (your team) ──
  const admins = [
    { email: 'manthan@gmail.com', name: 'Manthan', pass: 'mk12341234' },
    { email: 'shivam@gmail.com', name: 'Shivam', pass: 'sk12341234' },
    { email: 'rushi@gmail.com', name: 'Rushi', pass: 'rk12341234' },
    { email: 'tejas@gmail.com', name: 'Tejas', pass: 'tk12341234' },
  ];

  for (const a of admins) {
    const hash = await argon2.hash(a.pass, { type: argon2.argon2id });
    const userId = await upsertUser(a.email, a.name, hash);
    await ensurePlatformRole(userId, 'PLATFORM_ADMIN');
    console.log(`  ✓ Admin: ${a.email}`);
  }

  // ── Demo users ──
  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('SEED_DEMO_DATA not true — skipping demo data.');
    return;
  }

  console.log('Seeding demo data...');
  const demoHash = await argon2.hash('DemoOnly!234', { type: argon2.argon2id });
  const adminId = await upsertUser('admin@example.local', 'Demo Platform Admin', demoHash);
  await ensurePlatformRole(adminId, 'PLATFORM_ADMIN');

  const ownerId = await upsertUser('farmer@example.local', 'Demo Farm Owner', demoHash);
  const vetUserId = await upsertUser('vet@example.local', 'Dr Demo Veterinarian', demoHash);

  // Vet profile
  const existingVetProfile = await qOne('SELECT id FROM veterinarian_profiles WHERE user_id = ?', [
    vetUserId,
  ]);
  let vetProfileId;
  if (!existingVetProfile) {
    vetProfileId = cuid();
    await q(
      `INSERT INTO veterinarian_profiles (id, user_id, registration_number, registration_council,
             qualification, specialization, experience_years, status, reviewed_by_id, reviewed_at, review_notes)
             VALUES (?,?,?,?,?,?,?,?,?,NOW(),?)`,
      [
        vetProfileId,
        vetUserId,
        'DEMO-VET-001',
        'Demonstration Council (local data only)',
        'B.V.Sc. & A.H. — demonstration profile',
        'Bovine medicine',
        8,
        'VERIFIED',
        adminId,
        'Local demonstration verification; not government certification.',
      ],
    );
    // Service area
    await q(
      'INSERT INTO veterinarian_service_areas (id, veterinarian_id, state, district) VALUES (?,?,?,?)',
      [cuid(), vetProfileId, 'Karnataka', 'Mysuru'],
    );
  } else {
    vetProfileId = existingVetProfile.id;
  }

  // Check if demo farm already exists
  const existingFarm = await qOne('SELECT id FROM farms WHERE name = ? AND created_by_id = ?', [
    'SIH Demonstration Dairy',
    ownerId,
  ]);
  if (existingFarm) {
    console.log('Demo farm already exists — skipping demo creation.');
    return;
  }

  // Species & drug lookups
  const species = await qOne('SELECT id FROM species WHERE code = ?', ['BOS_TAURUS']);
  if (!species) {
    console.log('BOS_TAURUS species not found — skipping demo.');
    return;
  }

  const drug = await qOne('SELECT id FROM drugs WHERE code = ? OR canonical_name = ?', [
    'AMOXICILLIN',
    'Amoxicillin',
  ]);
  if (!drug) {
    console.log('Amoxicillin drug not found — skipping demo.');
    return;
  }

  const product = await qOne('SELECT id FROM drug_products WHERE source_record_id = ?', [
    'EU-700000186534',
  ]);

  const disease = await qOne('SELECT id FROM diseases WHERE code = ?', ['COND-MASTITIS-CLINICAL']);

  // Create farm
  const farmId = cuid();
  await q(
    `INSERT INTO farms (id, name, status, state, district, regulatory_jurisdiction,
           demonstration_mode, created_by_id) VALUES (?,?,?,?,?,?,?,?)`,
    [farmId, 'SIH Demonstration Dairy', 'ACTIVE', 'Karnataka', 'Mysuru', 'IRELAND', 1, ownerId],
  );

  // Farm member
  const memberId = cuid();
  await q(
    `INSERT INTO farm_members (id, farm_id, user_id, status, joined_at) VALUES (?,?,?,?,NOW())`,
    [memberId, farmId, ownerId, 'ACTIVE'],
  );
  await q('INSERT INTO farm_member_roles (id, farm_member_id, role) VALUES (?,?,?)', [
    cuid(),
    memberId,
    'FARM_OWNER',
  ]);
  await q('INSERT INTO farm_member_roles (id, farm_member_id, role) VALUES (?,?,?)', [
    cuid(),
    memberId,
    'FARM_MANAGER',
  ]);

  // Animals
  const eligibleAnimalId = cuid();
  await q(
    `INSERT INTO animals (id, farm_id, species_id, tag_number, verification_id, sex, lactating)
           VALUES (?,?,?,?,?,?,?)`,
    [
      eligibleAnimalId,
      farmId,
      species.id,
      'DEMO-COW-ELIGIBLE',
      'demo-animal-verification-eligible',
      'FEMALE',
      1,
    ],
  );

  const blockedAnimalId = cuid();
  await q(
    `INSERT INTO animals (id, farm_id, species_id, tag_number, verification_id, sex, lactating)
           VALUES (?,?,?,?,?,?,?)`,
    [
      blockedAnimalId,
      farmId,
      species.id,
      'DEMO-COW-RULE-MISSING',
      'demo-animal-verification-rule-missing',
      'FEMALE',
      1,
    ],
  );

  const completedAt = new Date(Date.now() - 4 * 86_400_000);

  // Create clinical story for each animal
  async function createClinicalStory(animalId, withExactProduct) {
    const reqId = cuid();
    await q(
      `INSERT INTO treatment_requests (id, farm_id, animal_id, requested_veterinarian_id,
             created_by_id, observations, symptoms, urgency, status, responded_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        reqId,
        farmId,
        animalId,
        vetProfileId,
        ownerId,
        'Reduced appetite and udder discomfort observed by farmer.',
        'Visible swelling; veterinarian assessment requested.',
        'SOON',
        'COMPLETED',
        completedAt,
      ],
    );

    const caseId = cuid();
    const openedAt = new Date(completedAt.getTime() - 4 * 86_400_000);
    await q(
      `INSERT INTO veterinary_cases (id, request_id, farm_id, animal_id, veterinarian_id,
             status, opened_at, completed_at) VALUES (?,?,?,?,?,?,?,?)`,
      [caseId, reqId, farmId, animalId, vetProfileId, 'COMPLETED', openedAt, completedAt],
    );

    // Messages
    await q('INSERT INTO case_messages (id, case_id, sender_id, body) VALUES (?,?,?,?)', [
      cuid(),
      caseId,
      ownerId,
      'Please review the recorded symptoms.',
    ]);
    await q('INSERT INTO case_messages (id, case_id, sender_id, body) VALUES (?,?,?,?)', [
      cuid(),
      caseId,
      vetUserId,
      'Clinical visit completed; structured records follow.',
    ]);

    // Diagnosis
    const diagId = cuid();
    const diagDate = new Date(completedAt.getTime() - 3 * 86_400_000);
    await q(
      `INSERT INTO diagnoses (id, case_id, animal_id, veterinarian_id, disease_id,
             clinical_notes, diagnosed_at) VALUES (?,?,?,?,?,?,?)`,
      [
        diagId,
        caseId,
        animalId,
        vetProfileId,
        disease?.id || null,
        'Demonstration veterinarian-entered clinical assessment.',
        diagDate,
      ],
    );

    // Prescription
    const prescId = cuid();
    const prescItemId = cuid();
    await q(
      `INSERT INTO prescriptions (id, case_id, animal_id, veterinarian_id, diagnosis_id,
             instructions, start_date, expected_end_date) VALUES (?,?,?,?,?,?,?,?)`,
      [
        prescId,
        caseId,
        animalId,
        vetProfileId,
        diagId,
        'Demonstration transactional instruction; not a dosage recommendation.',
        diagDate,
        completedAt,
      ],
    );

    await q(
      `INSERT INTO prescription_items (id, prescription_id, drug_id, drug_product_id,
             dose_value, dose_unit, route, frequency, duration_value, duration_unit, start_date)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        prescItemId,
        prescId,
        drug.id,
        withExactProduct ? product?.id : null,
        1,
        'recorded-unit',
        'INTRAMUSCULAR',
        'As veterinarian recorded for demonstration',
        1,
        'recorded-course',
        diagDate,
      ],
    );

    // Treatment
    const treatId = cuid();
    await q(
      `INSERT INTO treatments (id, case_id, animal_id, farm_id, veterinarian_id,
             prescription_id, status, started_at, completed_at, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        treatId,
        caseId,
        animalId,
        farmId,
        vetProfileId,
        prescId,
        'COMPLETED',
        diagDate,
        completedAt,
        'Deterministic local demonstration transaction.',
      ],
    );

    // Administration
    await q(
      `INSERT INTO treatment_administrations (id, treatment_id, prescription_item_id,
             animal_id, drug_id, drug_product_id, administered_by_id, amount, amount_unit,
             route, administered_at, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        cuid(),
        treatId,
        prescItemId,
        animalId,
        drug.id,
        withExactProduct ? product?.id : null,
        vetUserId,
        1,
        'recorded-unit',
        'INTRAMUSCULAR',
        completedAt,
        'Actual demonstration administration; value is transactional, not reference dosage.',
      ],
    );

    return treatId;
  }

  await createClinicalStory(eligibleAnimalId, true);
  await createClinicalStory(blockedAnimalId, false);

  // Audit logs
  await q(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id)
           VALUES (?,?,?,?,?)`,
    [cuid(), adminId, 'VETERINARIAN_VERIFIED', 'VeterinarianProfile', vetProfileId],
  );
  await q(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, farm_id)
           VALUES (?,?,?,?,?,?)`,
    [cuid(), ownerId, 'DEMO_FARM_CREATED', 'Farm', farmId, farmId],
  );

  console.log('Demo data seeded.');
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────
try {
  await importReferenceData();
  await seedAdminsAndDemo();
  console.log('\n✅ Seed completed successfully.');
} catch (error) {
  console.error('Seed failed:', error);
  process.exit(1);
} finally {
  await pool.end();
}
