require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function addSales() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('virgala');
    const result = await db.collection('plugins').updateMany(
      {},
      { $set: { sales: 0 } }
    );
    console.log(`✅ Updated ${result.modifiedCount} plugins!`);
  } finally {
    await client.close();
  }
}

addSales();