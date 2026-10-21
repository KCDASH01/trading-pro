import { PrismaClient, Market } from '@prisma/client'
import { STRATEGIES } from '../server/strategy.catalog'

const prisma = new PrismaClient()
async function main() {
  for (const strategy of STRATEGIES) {
    await prisma.strategy.upsert({
      where: { id_version: { id: strategy.id, version: strategy.version } },
      update: { displayName: strategy.displayName, category: strategy.category, market: Market.INDIA, enabled: true, metadata: { description: strategy.description, instrument: strategy.instrument, timeframe: strategy.timeframe, settings: strategy.settings } },
      create: { id: strategy.id, version: strategy.version, displayName: strategy.displayName, category: strategy.category, market: Market.INDIA, enabled: true, metadata: { description: strategy.description, instrument: strategy.instrument, timeframe: strategy.timeframe, settings: strategy.settings } },
    })
  }
}
main().finally(() => prisma.$disconnect())
