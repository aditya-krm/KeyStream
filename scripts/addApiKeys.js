import ApiKeyManager from '../models/apiKeyManager.js';
import config from '../config/config.js';
import readline from 'readline';

const apiKeyManager = new ApiKeyManager();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// First ask for the service details
function promptForService() {
  console.log('=== RapidAPI Key Management ===');
  console.log('Add your API keys to manage rotation for RapidAPI services.');
  
  rl.question('Enter the service name (e.g., linkedin-scraper, google-translate): ', (serviceName) => {
    if (serviceName.trim() === '') {
      console.log('Service name is required.');
      return promptForService();
    }
    
    rl.question('Enter the RapidAPI host (e.g., fresh-linkedin-profile-data.p.rapidapi.com): ', (host) => {
      if (host.trim() === '') {
        console.log('RapidAPI host is required.');
        return promptForService();
      }
      
      rl.question('Maximum usage per key (default: 100): ', (maxUsage) => {
        const maxUsageNumber = maxUsage.trim() === '' ? 100 : parseInt(maxUsage, 10);
        
        rl.question('Reset frequency (never, hourly, daily, weekly, monthly) (default: never): ', (resetFreq) => {
          const frequency = ['never', 'hourly', 'daily', 'weekly', 'monthly'].includes(resetFreq.trim()) 
            ? resetFreq.trim() 
            : 'never';
          
          // Add or update the service
          apiKeyManager.addService(serviceName, host, maxUsageNumber, frequency);
          console.log(`Service '${serviceName}' configured with host '${host}', max usage ${maxUsageNumber}, reset frequency: ${frequency}`);
          
          // Now proceed to add keys for this service
          addApiKey(serviceName);
        });
      });
    });
  });
}

// Then add keys to the service
function addApiKey(serviceName) {
  rl.question(`Enter a new RapidAPI key for '${serviceName}' (or press enter to finish): `, (key) => {
    if (key.trim() === '') {
      console.log('\nCurrent API key usage:');
      console.log(JSON.stringify(apiKeyManager.getUsageStats(serviceName), null, 2));
      rl.close();
      return;
    }
    
    if (apiKeyManager.addApiKey(serviceName, key.trim())) {
      console.log('API key added successfully!');
    } else {
      console.log('API key already exists or could not be added.');
    }
    
    addApiKey(serviceName); // Continue prompting for more keys
  });
}

// Start the prompting process
promptForService();