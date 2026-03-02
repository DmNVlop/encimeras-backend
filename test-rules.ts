import mongoose from "mongoose";

const MONGO_URI = "mongodb://127.0.0.1:27017/encimeras-db-dev";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;

  const rules = await db!.collection("discountrules").find({}).toArray();
  console.log("Total discount rules:", rules.length);

  for (const rule of rules) {
    console.log("------------------------");
    console.log(`Rule: ${rule.name}`);
    console.log(`- Type: ${rule.type}`);
    console.log(`- Value: ${rule.value}`);
    console.log(`- Priority: ${rule.priority}`);
    console.log(`- Stackable: ${rule.stackable}`);
    if (rule.conditions) {
      console.log(`- CustomerStrategy: ${rule.conditions.customerStrategy}`);
      console.log(`- TargetCustomers:`, rule.conditions.targetCustomers);
    }
  }

  const customers = await db!.collection("customers").find({}).toArray();
  console.log("------------------------");
  console.log("Customers in DB:");
  for (const c of customers) {
    console.log(`- ID: ${c._id}, Type: ${c.type}, Name: ${c.firstName || c.companyName} ${c.lastName || ""}`);
  }

  process.exit(0);
}

run().catch(console.error);
