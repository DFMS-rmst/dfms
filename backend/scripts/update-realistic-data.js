import { prisma } from '../src/infrastructure/prisma/client.js';

async function main() {
  console.log('Applying realistic variations to dairy intake and sales records...');

  // Update intakes with realistic varying quantities and rates per day
  const dailyIntakeVariations = {
    '2026-10-14': [
      { id: 'intake_1', qty: 26.0, fat: 4.3, snf: 8.7, rate: 43.0, cost: 1118.0 },
      { id: 'intake_2', qty: 22.5, fat: 4.2, snf: 8.6, rate: 42.5, cost: 956.25 },
      { id: 'intake_3', qty: 34.0, fat: 7.0, snf: 9.2, rate: 59.0, cost: 2006.0 },
      { id: 'intake_4', qty: 19.5, fat: 4.1, snf: 8.5, rate: 41.5, cost: 809.25 },
    ],
    '2026-10-15': [
      { id: 'intake_5', qty: 28.0, fat: 4.4, snf: 8.8, rate: 43.5, cost: 1218.0 },
      { id: 'intake_6', qty: 23.0, fat: 4.3, snf: 8.65, rate: 43.0, cost: 989.0 },
      { id: 'intake_7', qty: 36.5, fat: 7.1, snf: 9.3, rate: 60.0, cost: 2190.0 },
      { id: 'intake_8', qty: 21.0, fat: 4.0, snf: 8.5, rate: 41.0, cost: 861.0 },
    ],
    '2026-10-16': [
      { id: 'intake_9', qty: 23.5, fat: 4.1, snf: 8.55, rate: 42.0, cost: 987.0 },
      { id: 'intake_10', qty: 20.0, fat: 4.2, snf: 8.6, rate: 42.5, cost: 850.0 },
      { id: 'intake_11', qty: 30.5, fat: 6.8, snf: 9.0, rate: 58.0, cost: 1769.0 },
      { id: 'intake_12', qty: 17.0, fat: 3.9, snf: 8.45, rate: 40.5, cost: 688.5 },
    ],
    '2026-10-17': [
      { id: 'intake_13', qty: 29.5, fat: 4.5, snf: 8.9, rate: 44.0, cost: 1298.0 },
      { id: 'intake_14', qty: 25.0, fat: 4.4, snf: 8.7, rate: 43.5, cost: 1087.5 },
      { id: 'intake_15', qty: 38.0, fat: 7.2, snf: 9.4, rate: 61.0, cost: 2318.0 },
      { id: 'intake_16', qty: 22.5, fat: 4.2, snf: 8.6, rate: 42.0, cost: 945.0 },
    ],
    '2026-10-18': [
      { id: 'intake_17', qty: 25.0, fat: 4.2, snf: 8.6, rate: 42.5, cost: 1062.5 },
      { id: 'intake_18', qty: 21.5, fat: 4.3, snf: 8.65, rate: 43.0, cost: 924.5 },
      { id: 'intake_19', qty: 33.0, fat: 6.9, snf: 9.1, rate: 58.5, cost: 1930.5 },
      { id: 'intake_20', qty: 18.0, fat: 4.0, snf: 8.5, rate: 41.0, cost: 738.0 },
    ],
    '2026-10-19': [
      { id: 'intake_21', qty: 27.5, fat: 4.35, snf: 8.75, rate: 43.0, cost: 1182.5 },
      { id: 'intake_22', qty: 24.0, fat: 4.25, snf: 8.6, rate: 42.5, cost: 1020.0 },
      { id: 'intake_23', qty: 35.5, fat: 7.05, snf: 9.25, rate: 59.5, cost: 2112.25 },
      { id: 'intake_24', qty: 20.0, fat: 4.1, snf: 8.55, rate: 41.5, cost: 830.0 },
    ],
    '2026-10-20': [
      { id: 'intake_25', qty: 24.0, fat: 4.2, snf: 8.6, rate: 42.5, cost: 1020.0 },
      { id: 'intake_26', qty: 21.0, fat: 4.3, snf: 8.65, rate: 43.0, cost: 903.0 },
      { id: 'intake_27', qty: 31.5, fat: 6.85, snf: 9.05, rate: 58.0, cost: 1827.0 },
      { id: 'intake_28', qty: 18.5, fat: 4.0, snf: 8.5, rate: 41.0, cost: 758.5 },
    ],
  };

  for (const items of Object.values(dailyIntakeVariations)) {
    for (const item of items) {
      await prisma.$executeRawUnsafe(
        'UPDATE `dairy_milk_intakes` SET `quantityLiters` = ?, `fatPercentage` = ?, `snfPercentage` = ?, `ratePerLiter` = ?, `totalCost` = ? WHERE `id` = ?',
        item.qty,
        item.fat,
        item.snf,
        item.rate,
        item.cost,
        item.id,
      );
    }
  }

  // Update sales with realistic varying volumes and revenues per day
  const dailySalesVariations = {
    '2026-10-14': [
      { id: 'sale_1', qty: 32.0, price: 56.0, total: 1792.0 },
      { id: 'sale_2', qty: 22.0, price: 70.0, total: 1540.0 },
      { id: 'sale_3', qty: 18.0, price: 54.0, total: 972.0 },
    ],
    '2026-10-15': [
      { id: 'sale_4', qty: 38.0, price: 56.0, total: 2128.0 },
      { id: 'sale_5', qty: 28.0, price: 70.0, total: 1960.0 },
      { id: 'sale_6', qty: 24.0, price: 54.0, total: 1296.0 },
    ],
    '2026-10-16': [
      { id: 'sale_7', qty: 30.0, price: 56.0, total: 1680.0 },
      { id: 'sale_8', qty: 20.0, price: 70.0, total: 1400.0 },
      { id: 'sale_9', qty: 15.0, price: 54.0, total: 810.0 },
    ],
    '2026-10-17': [
      { id: 'sale_10', qty: 42.0, price: 56.0, total: 2352.0 },
      { id: 'sale_11', qty: 30.0, price: 70.0, total: 2100.0 },
      { id: 'sale_12', qty: 25.0, price: 54.0, total: 1350.0 },
    ],
    '2026-10-18': [
      { id: 'sale_13', qty: 34.0, price: 56.0, total: 1904.0 },
      { id: 'sale_14', qty: 24.0, price: 70.0, total: 1680.0 },
      { id: 'sale_15', qty: 20.0, price: 54.0, total: 1080.0 },
    ],
    '2026-10-19': [
      { id: 'sale_16', qty: 36.0, price: 56.0, total: 2016.0 },
      { id: 'sale_17', qty: 26.0, price: 70.0, total: 1820.0 },
      { id: 'sale_18', qty: 22.0, price: 54.0, total: 1188.0 },
    ],
    '2026-10-20': [
      { id: 'sale_19', qty: 35.0, price: 56.0, total: 1960.0 },
      { id: 'sale_20', qty: 25.0, price: 70.0, total: 1750.0 },
      { id: 'sale_21', qty: 20.0, price: 54.0, total: 1080.0 },
    ],
  };

  for (const items of Object.values(dailySalesVariations)) {
    for (const item of items) {
      await prisma.$executeRawUnsafe(
        'UPDATE `dairy_milk_sales` SET `quantityLiters` = ?, `pricePerLiter` = ?, `totalAmount` = ? WHERE `id` = ?',
        item.qty,
        item.price,
        item.total,
        item.id,
      );
    }
  }

  console.log('Successfully applied realistic dynamic operational data to dairy records.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
