import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);

const sampleClients = [
  { tenant: 'MBTA', clientId: 'MBTA-1001', fullName: 'Aarav Sharma', dob: '1985-04-12' },
  { tenant: 'MBTA', clientId: 'MBTA-1002', fullName: 'Priya Patel', dob: '1990-08-30' },
  { tenant: 'NYC-MTA', clientId: 'MTA-2050', fullName: 'Jordan Lee', dob: '1978-11-02' },
  { tenant: 'SEPTA', clientId: 'SEP-7781', fullName: 'Maya Rodriguez', dob: '1995-02-19' },
  { tenant: 'MBTA', clientId: 'MBTA-9009', fullName: 'Liam Carter', dob: '1971-09-07' },
];

async function main() {
  await client.connect();
  const db = client.db('transit_disability');
  const collection = db.collection('clients');

  await collection.deleteMany({});
  await collection.insertMany(sampleClients);
  await collection.createIndex({ tenant: 1, clientId: 1 }, { unique: true });

  const docs = await collection.find({}).toArray();
  console.log(JSON.stringify(docs, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
