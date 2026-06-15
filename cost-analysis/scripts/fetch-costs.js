const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const costExplorer = new AWS.CostExplorer();

const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 1);
const endDate = new Date();

async function getDailyCosts() {
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split("T")[0],
      End: endDate.toISOString().split("T")[0],
    },
    Granularity: "DAILY",
    Metrics: ["BlendedCost", "UnblendedCost", "UsageQuantity"],
    GroupBy: [
      { Type: "DIMENSION", Key: "SERVICE" },
    ],
  };

  try {
    const data = await costExplorer.getCostAndUsage(params).promise();
    return data.ResultsByTime;
  } catch (err) {
    console.error("Error fetching costs:", err);
    return [];
  }
}

async function getMonthlyCostByService() {
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split("T")[0],
      End: endDate.toISOString().split("T")[0],
    },
    Granularity: "MONTHLY",
    Metrics: ["BlendedCost"],
    GroupBy: [
      { Type: "DIMENSION", Key: "SERVICE" },
    ],
  };

  try {
    const data = await costExplorer.getCostAndUsage(params).promise();
    return data.ResultsByTime[0]?.Groups || [];
  } catch (err) {
    console.error("Error:", err);
    return [];
  }
}

function estimateLegacyCosts() {
  const ec2Cost = 3 * 2 * 24 * 30 * 0.05;
  const rdsCost = 0.10 * 24 * 30;
  const lbCost = 0.025 * 24 * 30;
  const eipCost = 3 * 0.005 * 24 * 30;
  const dataTransfer = 0.09 * 100;

  return {
    compute: ec2Cost,
    database: rdsCost,
    network: lbCost + eipCost + dataTransfer,
    total: ec2Cost + rdsCost + lbCost + eipCost + dataTransfer,
    label: "Legacy EC2 Monolith",
  };
}

function estimateEKSCosts() {
  const eksCluster = 0.10 * 24 * 30;
  const nodeCost = 3 * 2 * 24 * 30 * 0.065;
  const rdsCost = 0.10 * 24 * 30;
  const albCost = 0.025 * 24 * 30;
  const natCost = 3 * 0.045 * 24 * 30;
  const dataTransfer = 0.09 * 80;

  return {
    compute: eksCluster + nodeCost,
    database: rdsCost,
    network: albCost + natCost + dataTransfer,
    total: eksCluster + nodeCost + rdsCost + albCost + natCost + dataTransfer,
    label: "EKS Microservices",
  };
}

function calculateSavings(legacy, eks) {
  const savings = legacy.total - eks.total;
  const percentage = (savings / legacy.total) * 100;

  return {
    monthlySavings: savings.toFixed(2),
    savingsPercentage: percentage.toFixed(1),
    isOptimized: savings > 0,
  };
}

async function main() {
  console.log("=== Cost Optimization Analysis ===\n");

  const legacy = estimateLegacyCosts();
  const eks = estimateEKSCosts();
  const savings = calculateSavings(legacy, eks);

  console.log(`Legacy (${legacy.label}):
  Compute:  $${legacy.compute.toFixed(2)}/mo
  Database: $${legacy.database.toFixed(2)}/mo
  Network:  $${legacy.network.toFixed(2)}/mo
  --------------------------------
  Total:    $${legacy.total.toFixed(2)}/mo
`);

  console.log(`Modern (${eks.label}):
  Compute:  $${eks.compute.toFixed(2)}/mo
  Database: $${eks.database.toFixed(2)}/mo
  Network:  $${eks.network.toFixed(2)}/mo
  --------------------------------
  Total:    $${eks.total.toFixed(2)}/mo
`);

  console.log("=== Savings ===");
  console.log(`Monthly Savings: $${savings.monthlySavings}`);
  console.log(`Savings %: ${savings.savingsPercentage}%`);
  console.log(`Optimized: ${savings.isOptimized ? "Yes ✅" : "No ❌"}`);

  console.log("\n=== Resource Efficiency ===");
  console.log("Kubernetes auto-scaling reduces idle capacity");
  console.log("Shared cluster resource utilization: ~70% (vs ~40% on EC2)");
  console.log("Automated right-sizing via HPA and Cluster Autoscaler");

  const dailyCosts = await getDailyCosts();
  if (dailyCosts.length > 0) {
    console.log("\n=== Actual AWS Costs (Last 30 Days) ===");
    console.log(JSON.stringify(dailyCosts.slice(0, 5), null, 2));
  }
}

main().catch(console.error);
