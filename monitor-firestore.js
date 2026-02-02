// Simple Firestore monitoring script
// Run this to check current usage patterns

const monitoring = {
  operations: [],
  startTime: Date.now(),
  
  logOperation(type, operationKey, success = true) {
    this.operations.push({
      timestamp: Date.now(),
      type,
      operationKey,
      success,
      timeSinceStart: Date.now() - this.startTime
    });
    
    // Keep only last 100 operations
    if (this.operations.length > 100) {
      this.operations.shift();
    }
    
    this.printStats();
  },
  
  printStats() {
    const lastMinute = this.operations.filter(op => 
      op.timestamp > (Date.now() - 60000)
    );
    
    const writeOps = lastMinute.filter(op => op.type === 'write');
    const readOps = lastMinute.filter(op => op.type === 'read');
    
    console.log('\n=== FIRESTORE MONITORING ===');
    console.log(`Last minute: ${writeOps.length} writes, ${readOps.length} reads`);
    console.log(`Total operations: ${this.operations.length}`);
    console.log(`Running for: ${Math.floor((Date.now() - this.startTime) / 1000)} seconds`);
    
    if (writeOps.length > 10) {
      console.warn('⚠️ High write activity detected!');
    }
    if (readOps.length > 50) {
      console.warn('⚠️ High read activity detected!');
    }
    console.log('========================\n');
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = monitoring;
}