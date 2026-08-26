import fs from 'node:fs/promises';

const referenceUrl = (name) => new URL(`../../data/reference/${name}.json`, import.meta.url);
const read = async (name) => JSON.parse(await fs.readFile(referenceUrl(name), 'utf8'));
const date = (value) => (value ? new Date(`${value}T00:00:00.000Z`) : null);
const status = (value) => {
  if (value === 'EXAMPLE_ONLY' || value?.includes('FOREIGN_JURISDICTION')) return 'EXAMPLE_ONLY';
  if (value === 'NOT_AVAILABLE') return 'NOT_AVAILABLE';
  if (value === 'RULE_NOT_FOUND') return 'RULE_NOT_FOUND';
  if (value === 'CONFLICTING_SOURCE') return 'CONFLICTING_SOURCE';
  if (value?.startsWith('VERIFIED') && !value.includes('REVIEW')) return 'VERIFIED';
  return 'REVIEW_REQUIRED';
};

export async function importReferenceData(prisma) {
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
  for (const source of sourceData.records)
    await prisma.regulatorySource.upsert({
      where: { sourceRecordId: source.id },
      create: {
        sourceRecordId: source.id,
        organization: source.organization,
        title: source.title,
        url: source.url,
        jurisdiction: source.jurisdiction,
        publicationDate: date(source.publication_date),
        effectiveDate: date(source.effective_date),
        retrievalDate: date(sourceData.retrieval_date),
      },
      update: { organization: source.organization, title: source.title, url: source.url },
    });
  for (const item of speciesData.records)
    await prisma.species.upsert({
      where: { code: item.id.replace('SP-', '').replaceAll('-', '_') },
      create: {
        code: item.id.replace('SP-', '').replaceAll('-', '_'),
        canonicalName: item.canonical_name,
        scientificName: item.scientific_name,
        sourceRecordId: item.id,
      },
      update: {
        canonicalName: item.canonical_name,
        scientificName: item.scientific_name,
        sourceRecordId: item.id,
      },
    });
  for (const item of classData.records) {
    const existing = await prisma.antimicrobialClass.findFirst({
      where: { canonicalName: item.canonical_name },
    });
    if (existing)
      await prisma.antimicrobialClass.update({
        where: { id: existing.id },
        data: { sourceRecordId: item.id },
      });
    else
      await prisma.antimicrobialClass.create({
        data: { code: item.id, canonicalName: item.canonical_name, sourceRecordId: item.id },
      });
  }
  const classes = Object.fromEntries(
    (await prisma.antimicrobialClass.findMany()).map((x) => [x.sourceRecordId, x]),
  );
  for (const item of drugData.records) {
    const existing = await prisma.drug.findFirst({ where: { canonicalName: item.canonical_name } });
    const data = {
      canonicalName: item.canonical_name,
      aliases: item.aliases,
      sourceRecordId: item.id,
      antimicrobialClassId: classes[item.class_id]?.id,
    };
    if (existing) await prisma.drug.update({ where: { id: existing.id }, data });
    else await prisma.drug.create({ data: { code: item.id, ...data } });
  }
  const drugs = Object.fromEntries(
    (await prisma.drug.findMany()).map((x) => [x.sourceRecordId, x]),
  );
  const species = Object.fromEntries(
    (await prisma.species.findMany()).map((x) => [x.sourceRecordId, x]),
  );
  const sources = Object.fromEntries(
    (await prisma.regulatorySource.findMany()).map((x) => [x.sourceRecordId, x]),
  );
  for (const item of diseaseData.records)
    await prisma.disease.upsert({
      where: { code: item.id },
      create: {
        code: item.id,
        canonicalName: item.canonical_name,
        antimicrobialRelevance: item.antimicrobial_relevance || 'VET_ASSESSMENT',
        sourceRecordId: item.id,
      },
      update: {
        canonicalName: item.canonical_name,
        antimicrobialRelevance: item.antimicrobial_relevance || 'VET_ASSESSMENT',
        sourceRecordId: item.id,
      },
    });
  for (const item of relationships.records)
    await prisma.drugSpecies.upsert({
      where: {
        drugId_speciesId: {
          drugId: drugs[item.drug_id].id,
          speciesId: species[item.species_id].id,
        },
      },
      create: {
        drugId: drugs[item.drug_id].id,
        speciesId: species[item.species_id].id,
        status: item.status,
      },
      update: { status: item.status },
    });
  const productByReference = {};
  for (const rule of withdrawals.records) {
    if (!rule.product_id) continue;
    let product = await prisma.drugProduct.findFirst({
      where: { sourceRecordId: rule.product_id },
    });
    const productData = {
      drugId: drugs[rule.drug_ids[0]].id,
      productName: rule.product_name,
      authorizationNumber: rule.product_id,
      jurisdiction: rule.jurisdiction,
      formulation: rule.formulation,
      route: rule.route,
      sourceRecordId: rule.product_id,
    };
    product = product
      ? await prisma.drugProduct.update({ where: { id: product.id }, data: productData })
      : await prisma.drugProduct.create({ data: productData });
    productByReference[rule.product_id] = product;
  }
  for (const rule of withdrawals.records)
    for (const speciesId of rule.species_ids) {
      const code = rule.species_ids.length > 1 ? `${rule.id}-${speciesId}` : rule.id;
      const data = {
        code,
        version: 1,
        drugId: rule.drug_ids[0] ? drugs[rule.drug_ids[0]].id : null,
        drugProductId: rule.product_id ? productByReference[rule.product_id].id : null,
        speciesId: species[speciesId].id,
        foodProduct: rule.food_product,
        route: rule.route,
        formulation: rule.formulation,
        useConditions: rule.use_conditions,
        durationValue: rule.duration.value,
        durationUnit: rule.duration.unit,
        durationQualifier: rule.duration.qualifier,
        jurisdiction: rule.jurisdiction,
        sourceId: sources[rule.source_ids[0]].id,
        sourceSection: rule.source_section,
        effectiveFrom: date(rule.effective_date),
        verificationStatus: status(rule.verification_status),
        ruleType: rule.rule_type,
        certificateUse: rule.certificate_use,
      };
      await prisma.withdrawalRule.upsert({
        where: { code_version: { code, version: 1 } },
        create: data,
        update: data,
      });
    }
  for (const item of mrls.records) {
    const data = {
      code: item.id,
      drugId: drugs[item.drug_id].id,
      speciesId: item.species_id ? species[item.species_id].id : null,
      speciesScope: item.species_scope,
      foodProduct: item.food_product,
      value: item.value,
      unit: item.unit,
      jurisdiction: item.jurisdiction,
      sourceId: sources[item.source_ids[0]].id,
      verificationStatus: status(item.verification_status),
    };
    await prisma.mrlReferenceRule.upsert({ where: { code: item.id }, create: data, update: data });
  }
}
