import hre from "hardhat";

console.log("=== Hardhat Runtime Environment ===");
console.log("Available tasks:", Object.keys(hre.tasks));
console.log("\n=== Ignition tasks ===");
const ignitionTasks = Object.keys(hre.tasks).filter(task => task.includes('ignition'));
console.log("Ignition tasks found:", ignitionTasks);

console.log("\n=== All tasks ===");
for (const taskName of Object.keys(hre.tasks)) {
  console.log(taskName);
}
