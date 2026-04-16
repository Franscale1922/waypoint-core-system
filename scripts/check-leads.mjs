import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const raw = await prisma.lead.count({ where: { status: 'RAW' } });
    const pendingClay = await prisma.lead.count({ where: { status: 'PENDING_CLAY' } });
    const enriched = await prisma.lead.count({ where: { status: 'ENRICHED' } });
    const warming = await prisma.lead.count({ where: { status: 'WARMING' } });
    const sequenced = await prisma.lead.count({ where: { status: 'SEQUENCED' } });
    const sent = await prisma.lead.count({ where: { status: 'SENT' } });
    
    // Also fetch SystemSettings for maxSendsPerDay
    const settings = await prisma.systemSettings.findFirst();
    const maxSends = settings?.maxSendsPerDay || 15;

    console.log(`--- Lead Pipeline Status ---`);
    console.log(`PENDING_CLAY: ${pendingClay}`);
    console.log(`RAW: ${raw}`);
    console.log(`ENRICHED: ${enriched}`);
    console.log(`WARMING: ${warming}`);
    console.log(`SEQUENCED (Ready to send): ${sequenced}`);
    console.log(`SENT (Total history): ${sent}`);
    console.log(`------------------------------`);
    console.log(`Settings: maxSendsPerDay is set to ${maxSends}`);
    if (sequenced > 0) {
        console.log(`That means you currently have ${(sequenced / maxSends).toFixed(1)} days' worth of leads queued up in SEQUENCED.`);
    } else {
        console.log(`You currently have NO leads queued in SEQUENCED.`);
    }

    if (warming > 0) {
        console.log(`There are ${warming} leads running through the 14-day WARMING phase.`);
    }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
