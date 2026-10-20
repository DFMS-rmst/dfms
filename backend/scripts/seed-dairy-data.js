import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  console.log('Seeding initial dairy data...');

  // Find dairy user (either registered dairy or demo dairy)
  const dairyUser =
    (await prisma.user.findFirst({
      where: {
        OR: [{ email: 'dairy@gmail.com' }, { email: 'dairy@example.local' }],
      },
    })) || (await prisma.user.findFirst());

  if (!dairyUser) {
    console.log('No user found to associate with dairy data');
    return;
  }

  const dairyUserId = dairyUser.id;
  console.log('Associating dairy data with dairyUserId:', dairyUserId);

  // Check if enrollments already exist
  const existingEnrollments = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ?',
    dairyUserId,
  );
  const count = Number(existingEnrollments[0]?.count || 0);

  if (count === 0) {
    console.log('Inserting default enrolled farmers & join requests...');
    const farmers = [
      {
        id: 'dfe_tejas_farm',
        dairyUserId,
        farmerUserId: 'cmvgtzgf20010kjwca7kklcyg',
        farmerIdNumber: 'hkasdf023047304',
        farmerName: 'Tejas Patil',
        farmName: 'Tejas Farm',
        phone: '9822012345',
        email: 'farm@gmail.com',
        state: 'Maharashtra',
        district: 'kolhapur',
        taluka: 'Karvir',
        villageArea: 'Sarnobatwadi Route 1',
        pincode: '416115',
        milkType: 'COW',
        expectedDailyQuantity: 45.0,
        agreedRatePerLiter: 42.5,
        baseFatPercentage: 4.2,
        baseSnfPercentage: 8.6,
        paymentMethod: 'BANK_TRANSFER',
        bankAccountNumber: '30492819283',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        upiId: 'tejas@upi',
        status: 'ACTIVE',
        joinRequestNotes: 'Enrolled priority supplier. Clean veterinary record.',
      },
      {
        id: 'dfe_ramesh_jadhav',
        dairyUserId,
        farmerUserId: null,
        farmerIdNumber: 'KCC-MH-2024-5501',
        farmerName: 'Ramesh Jadhav',
        farmName: 'Jadhav Dairy Farm',
        phone: '9822154321',
        email: 'ramesh.jadhav@example.com',
        state: 'Maharashtra',
        district: 'kolhapur',
        taluka: 'Karvir',
        villageArea: 'Uchgaon Village Center',
        pincode: '416005',
        milkType: 'BUFFALO',
        expectedDailyQuantity: 60.0,
        agreedRatePerLiter: 58.0,
        baseFatPercentage: 6.8,
        baseSnfPercentage: 9.0,
        paymentMethod: 'BANK_TRANSFER',
        bankAccountNumber: '91823746192',
        bankIfsc: 'MAHB0000456',
        bankName: 'Bank of Maharashtra',
        upiId: 'ramesh@okhdfcbank',
        status: 'ACTIVE',
        joinRequestNotes: 'High fat buffalo milk supplier.',
      },
      {
        id: 'dfe_suresh_shinde',
        dairyUserId,
        farmerUserId: null,
        farmerIdNumber: 'FRM-KOL-8820',
        farmerName: 'Suresh Shinde',
        farmName: 'Shinde Gomata Sadan',
        phone: '9421188330',
        email: 'suresh.shinde@example.com',
        state: 'Maharashtra',
        district: 'kolhapur',
        taluka: 'Karvir',
        villageArea: 'Gokul Shirgaon Hub',
        pincode: '416234',
        milkType: 'COW',
        expectedDailyQuantity: 30.0,
        agreedRatePerLiter: 41.0,
        baseFatPercentage: 4.0,
        baseSnfPercentage: 8.5,
        paymentMethod: 'UPI',
        bankAccountNumber: '50100234123',
        bankIfsc: 'HDFC0001239',
        bankName: 'HDFC Bank',
        upiId: 'shindefarm@upi',
        status: 'ACTIVE',
        joinRequestNotes: 'Daily morning delivery verified.',
      },
      {
        id: 'dfe_aniket_desai_req',
        dairyUserId,
        farmerUserId: null,
        farmerIdNumber: 'FRM-REQ-9012',
        farmerName: 'Aniket Desai',
        farmName: 'Krishna Valley Cattle Farm',
        phone: '9765432109',
        email: 'aniket.desai@example.com',
        state: 'Maharashtra',
        district: 'kolhapur',
        taluka: 'Hatkanangle',
        villageArea: 'Shiroli MIDC Area',
        pincode: '416122',
        milkType: 'COW',
        expectedDailyQuantity: 55.0,
        agreedRatePerLiter: 42.0,
        baseFatPercentage: 4.1,
        baseSnfPercentage: 8.55,
        paymentMethod: 'BANK_TRANSFER',
        bankAccountNumber: '49281928371',
        bankIfsc: 'ICIC0000987',
        bankName: 'ICICI Bank',
        upiId: 'aniketd@icici',
        status: 'PENDING_APPROVAL',
        joinRequestNotes: 'New farmer application requesting daily morning and evening collection.',
      },
      {
        id: 'dfe_vikram_more_req',
        dairyUserId,
        farmerUserId: null,
        farmerIdNumber: 'FRM-REQ-9015',
        farmerName: 'Vikram More',
        farmName: 'More Dairy Cattle',
        phone: '9890123456',
        email: 'vikram.more@example.com',
        state: 'Maharashtra',
        district: 'kolhapur',
        taluka: 'Panhala',
        villageArea: 'Panhala Hill Dairy Center',
        pincode: '416201',
        milkType: 'BUFFALO',
        expectedDailyQuantity: 40.0,
        agreedRatePerLiter: 57.5,
        baseFatPercentage: 6.5,
        baseSnfPercentage: 8.9,
        paymentMethod: 'UPI',
        bankAccountNumber: null,
        bankIfsc: null,
        bankName: null,
        upiId: 'vikrammore@paytm',
        status: 'PENDING_APPROVAL',
        joinRequestNotes:
          'Requested to join dairy collection route #3. Needs route manager inspection.',
      },
    ];

    for (const f of farmers) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_farmer_enrollments\` (
          \`id\`, \`dairyUserId\`, \`farmerUserId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
          \`phone\`, \`email\`, \`state\`, \`district\`, \`taluka\`, \`villageArea\`, \`pincode\`,
          \`milkType\`, \`expectedDailyQuantity\`, \`agreedRatePerLiter\`, \`baseFatPercentage\`,
          \`baseSnfPercentage\`, \`paymentMethod\`, \`bankAccountNumber\`, \`bankIfsc\`, \`bankName\`,
          \`upiId\`, \`status\`, \`joinRequestNotes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        f.id,
        f.dairyUserId,
        f.farmerUserId,
        f.farmerIdNumber,
        f.farmerName,
        f.farmName,
        f.phone,
        f.email,
        f.state,
        f.district,
        f.taluka,
        f.villageArea,
        f.pincode,
        f.milkType,
        f.expectedDailyQuantity,
        f.agreedRatePerLiter,
        f.baseFatPercentage,
        f.baseSnfPercentage,
        f.paymentMethod,
        f.bankAccountNumber,
        f.bankIfsc,
        f.bankName,
        f.upiId,
        f.status,
        f.joinRequestNotes,
      );
    }
  }

  // Check milk intakes
  const existingIntakes = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM `dairy_milk_intakes` WHERE `dairyUserId` = ?',
    dairyUserId,
  );
  if (Number(existingIntakes[0]?.count || 0) === 0) {
    console.log('Generating realistic 7-day milk collection intake records...');
    const now = new Date();
    let intakeId = 1;

    for (let d = 6; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 86400000);
      const dateStr = date.toISOString().split('T')[0];

      // Farmer 1 (Tejas) - Morning & Evening
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_intakes\` (
          \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
          \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
          \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
          \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `intake_${intakeId++}`,
        dairyUserId,
        'dfe_tejas_farm',
        'hkasdf023047304',
        'Tejas Patil',
        'Tejas Farm',
        'Sarnobatwadi Route 1',
        dateStr,
        'MORNING',
        'COW',
        24.5,
        4.2,
        8.6,
        42.5,
        1041.25,
        'Silo-1 (Raw Cow)',
        'CLEARED',
        'PAID',
        'GRADE_A',
        'AMU Clearance verified safe. High quality.',
      );

      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_intakes\` (
          \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
          \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
          \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
          \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `intake_${intakeId++}`,
        dairyUserId,
        'dfe_tejas_farm',
        'hkasdf023047304',
        'Tejas Patil',
        'Tejas Farm',
        'Sarnobatwadi Route 1',
        dateStr,
        'EVENING',
        'COW',
        21.0,
        4.3,
        8.65,
        43.0,
        903.0,
        'Silo-1 (Raw Cow)',
        'CLEARED',
        'PAID',
        'GRADE_A',
        'Evening batch received at 6:30 PM.',
      );

      // Farmer 2 (Ramesh) - Morning
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_intakes\` (
          \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
          \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
          \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
          \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `intake_${intakeId++}`,
        dairyUserId,
        'dfe_ramesh_jadhav',
        'KCC-MH-2024-5501',
        'Ramesh Jadhav',
        'Jadhav Dairy Farm',
        'Uchgaon Village Center',
        dateStr,
        'MORNING',
        'BUFFALO',
        32.0,
        6.9,
        9.1,
        58.5,
        1872.0,
        'Silo-2 (Buffalo)',
        'CLEARED',
        'PAID',
        'GRADE_A',
        'Pure buffalo milk, excellent SNF.',
      );

      // Farmer 3 (Suresh) - Morning
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_intakes\` (
          \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
          \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
          \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
          \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `intake_${intakeId++}`,
        dairyUserId,
        'dfe_suresh_shinde',
        'FRM-KOL-8820',
        'Suresh Shinde',
        'Shinde Gomata Sadan',
        'Gokul Shirgaon Hub',
        dateStr,
        'MORNING',
        'COW',
        18.5,
        4.0,
        8.5,
        41.0,
        758.5,
        'Tank A (Chilled Bulk)',
        'CLEARED',
        'PAID',
        'GRADE_A',
        'Standard collection.',
      );
    }
  }

  // Check sales
  const existingSales = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM `dairy_milk_sales` WHERE `dairyUserId` = ?',
    dairyUserId,
  );
  if (Number(existingSales[0]?.count || 0) === 0) {
    console.log('Generating realistic 7-day milk sales records...');
    const now = new Date();
    let saleId = 1;

    for (let d = 6; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 86400000);
      const dateStr = date.toISOString().split('T')[0];

      // Retail morning sales
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_sales\` (
          \`id\`, \`dairyUserId\`, \`saleDate\`, \`invoiceNumber\`, \`buyerName\`, \`buyerType\`,
          \`milkType\`, \`quantityLiters\`, \`pricePerLiter\`, \`totalAmount\`, \`dispensedFromTank\`,
          \`paymentStatus\`, \`paymentMethod\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `sale_${saleId++}`,
        dairyUserId,
        dateStr,
        `INV-${dateStr.replace(/-/g, '')}-001`,
        'Morning Retail Counter (Local Households)',
        'RETAIL_CONSUMER',
        'COW',
        35.0,
        56.0,
        1960.0,
        'Tank A (Chilled Bulk)',
        'PAID',
        'UPI',
        'Local resident consumers counter sales.',
      );

      // Sweet Mart Commercial Wholesale
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_sales\` (
          \`id\`, \`dairyUserId\`, \`saleDate\`, \`invoiceNumber\`, \`buyerName\`, \`buyerType\`,
          \`milkType\`, \`quantityLiters\`, \`pricePerLiter\`, \`totalAmount\`, \`dispensedFromTank\`,
          \`paymentStatus\`, \`paymentMethod\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `sale_${saleId++}`,
        dairyUserId,
        dateStr,
        `INV-${dateStr.replace(/-/g, '')}-002`,
        'Mahalaxmi Sweets & Dairy Products',
        'COMMERCIAL_SHOP',
        'BUFFALO',
        25.0,
        70.0,
        1750.0,
        'Silo-2 (Buffalo)',
        'PAID',
        'BANK_TRANSFER',
        'High-fat buffalo milk for sweet preparation.',
      );

      // Evening Dairy Booth
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_milk_sales\` (
          \`id\`, \`dairyUserId\`, \`saleDate\`, \`invoiceNumber\`, \`buyerName\`, \`buyerType\`,
          \`milkType\`, \`quantityLiters\`, \`pricePerLiter\`, \`totalAmount\`, \`dispensedFromTank\`,
          \`paymentStatus\`, \`paymentMethod\`, \`notes\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `sale_${saleId++}`,
        dairyUserId,
        dateStr,
        `INV-${dateStr.replace(/-/g, '')}-003`,
        'City Center Milk Booth #4',
        'WHOLESALE_DISTRIBUTOR',
        'COW',
        20.0,
        55.0,
        1100.0,
        'Silo-1 (Raw Cow)',
        'PAID',
        'CASH',
        'Evening distribution delivery.',
      );
    }
  }

  console.log('Dairy demonstration dataset successfully seeded!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
