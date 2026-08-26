export async function createAlerts(client, userIds, data) {
  if (!userIds.length) return;
  const { dedupKeyPrefix, ...alertData } = data;
  await client.alert.createMany({
    data: [...new Set(userIds)].map((userId) => ({
      userId,
      ...alertData,
      ...(dedupKeyPrefix ? { dedupKey: `${dedupKeyPrefix}:${userId}` } : {}),
    })),
    skipDuplicates: true,
  });
}
