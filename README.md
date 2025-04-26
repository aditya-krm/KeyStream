# KeyStream: Multi-Service RapidAPI Key Management Proxy

![KeyStream Logo](https://via.placeholder.com/200x80?text=KeyStream)

KeyStream is an advanced API proxy service that maximizes your RapidAPI free tier usage through intelligent key rotation. It provides a unified interface for multiple RapidAPI services while efficiently managing API key usage limits.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg)](https://nodejs.org/)

## 🌟 Key Features

- **Smart API Key Rotation**: Automatically selects the least-used API key to maximize free tier usage
- **Multi-Service Support**: Works with any RapidAPI service, not just one
- **Usage Tracking**: Real-time monitoring of remaining API calls for each key
- **Configurable Reset Periods**: Support for hourly, daily, weekly, and monthly reset frequencies
- **Simple Service Addition**: Easily add new RapidAPI services via API endpoints
- **Unified API**: Clean, consistent endpoints for all supported services

## 📋 Currently Supported Services

- **LinkedIn Profile Data** - Extract detailed profile information from LinkedIn URLs
- **Google Translate** - Complete translation capabilities including:
  - Text translation
  - Batch translation
  - JSON content translation
  - HTML content translation
  - Language detection
  - Supported languages listing

## 🔧 Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/keystream.git
cd keystream
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the project root:
```
PORT=3004  # Or any port you prefer
```

4. Add your RapidAPI services and keys using the CLI tool:
```bash
node scripts/addApiKeys.js
```

5. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## 📚 API Documentation

### Core API Management Endpoints

#### Add a New Service

**Endpoint:** `POST /services`

**Body:**
```json
{
  "serviceName": "google-translate",
  "host": "google-translate113.p.rapidapi.com",
  "maxUsage": 20,
  "resetFrequency": "daily"
}
```

Valid `resetFrequency` values: `"never"`, `"hourly"`, `"daily"`, `"weekly"`, `"monthly"`

#### Add API Key to a Service

**Endpoint:** `POST /services/:serviceName/keys`

**Body:**
```json
{
  "apiKey": "your-rapid-api-key-here",
  "remainingUses": 50
}
```

The `remainingUses` parameter is optional. If provided, KeyStream will initialize the key with this many remaining uses.

#### Update Remaining Uses for a Key

**Endpoint:** `PUT /services/:serviceName/keys/:apiKey/remaining`

**Body:**
```json
{
  "remainingUses": 100
}
```

#### Get API Key Statistics for All Services

**Endpoint:** `GET /api-keys`

#### Get API Key Statistics for a Specific Service

**Endpoint:** `GET /services/:serviceName/stats`

### Service-Specific Endpoints

#### LinkedIn Profile Data

**Endpoint:** `GET /linkedin/:profileUrl`

`:profileUrl` can be a username or complete LinkedIn profile URL.

#### Google Translate

##### Text Translation
**Endpoint:** `POST /translate/text`

**Body:**
```json
{
  "text": "Hello world",
  "targetLang": "es",
  "sourceLang": "en"
}
```

##### Batch Translation
**Endpoint:** `POST /translate/batch`

**Body:**
```json
{
  "texts": ["Hello", "Good morning"],
  "targetLang": "fr",
  "sourceLang": "en",
  "protectedPaths": ["extra.last_comment.author"],
  "commonProtectedPaths": ["image"]
}
```

##### JSON Translation
**Endpoint:** `POST /translate/json`

**Body:**
```json
{
  "json": {"greeting": "Welcome", "message": "Please login"},
  "targetLang": "de",
  "sourceLang": "en"
}
```

##### HTML Translation
**Endpoint:** `POST /translate/html`

**Body:**
```json
{
  "html": "<h1>Welcome</h1><p>Thank you for visiting.</p>",
  "targetLang": "it",
  "sourceLang": "en"
}
```

##### Language Detection
**Endpoint:** `POST /translate/detect`

**Body:**
```json
{
  "text": "Bonjour le monde"
}
```

##### Supported Languages
**Endpoint:** `GET /translate/languages`

### Generic RapidAPI Proxy

For any RapidAPI service that doesn't have a dedicated endpoint, you can use the generic proxy endpoint:

**Endpoint:** `POST /api/:serviceName/:endpoint(*)`

**Body:**
```json
{
  "method": "POST",
  "queryParams": {
    "param1": "value1"
  },
  "bodyData": {
    "key1": "value1"
  }
}
```

## ⚙️ How KeyStream Works

### API Key Rotation Strategy

1. **Key Selection**: The system selects the API key with the lowest usage count for each service
2. **Usage Tracking**: After each successful API call, the usage count is incremented
3. **Reset Scheduling**: Based on the service's reset frequency, usage counts are automatically reset
4. **Fail-Safe Mechanism**: When all keys reach their limits, the system still operates but warns users

### Multi-Service Architecture

KeyStream uses a modular architecture that allows easy addition of new RapidAPI services:

1. **Service Registry**: Each service is registered with its host and rate limit information
2. **Key Pools**: API keys are managed in separate pools for each service
3. **Service Adapters**: Dedicated modules handle service-specific functionalities
4. **Unified API**: All services are accessible through a consistent REST API

## 🛠️ Extending KeyStream

### Adding a New Service

To add support for a new RapidAPI service:

1. Create a new service file in the `services/` directory
2. Implement service-specific functions that call the generic `callRapidApi()` function
3. Add new routes in the appropriate routes file

Example service implementation:
```javascript
import { callRapidApi } from './api/rapidApiService.js';

const SERVICE_NAME = 'new-service';

export const someFunction = async (params) => {
  try {
    const result = await callRapidApi(
      SERVICE_NAME,
      'api/v1/endpoint',
      'POST',
      {},
      { key: value }
    );
    
    return {
      data: result.data,
      apiKeyRemaining: result._apiKeyRemaining
    };
  } catch (error) {
    console.error('Error calling service:', error);
    throw error;
  }
};
```

## 🚀 Deployment

### Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
docker build -t keystream .
docker run -p 3004:3004 -d keystream
```

### AWS EC2 Deployment

1. Launch an EC2 instance
2. Install Docker on the instance
3. Clone the repository
4. Build and run the Docker container
5. Use Nginx as a reverse proxy to handle HTTPS and domain routing

### PM2 Deployment (Direct on Server)

```bash
npm install -g pm2
pm2 start server.js --name "keystream"
pm2 startup
pm2 save
```

## 🔒 Security Best Practices

For production environments:

1. **Add Authentication**: Protect your endpoints with API keys or JWT tokens
2. **Use HTTPS**: Set up SSL/TLS for secure communication
3. **Implement Rate Limiting**: Prevent abuse of your proxy service
4. **Validate Input**: Carefully validate all user input
5. **Monitor Usage**: Set up alerts for unexpected usage patterns

## 🤝 Contributing

We welcome contributions from the community! This section provides detailed guidelines on how to contribute to KeyStream effectively.

### Contribution Guidelines

#### 1. Setting Up Your Development Environment

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/keystream.git
   cd keystream
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the project root:
   ```
   PORT=3004  # Or any port you prefer
   LOG_LEVEL=debug  # For development
   ```

4. **Add Test API Keys**
   ```bash
   node scripts/addApiKeys.js
   ```

#### 2. Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Code Style Guidelines**
   - Follow the existing code style and patterns
   - Use meaningful variable and function names
   - Add JSDoc comments for all functions
   - Maintain a consistent code structure
   - Use async/await pattern for asynchronous operations

3. **Commit Guidelines**
   - Use clear, descriptive commit messages
   - Format: `[scope]: Brief description of changes`
   - Example: `[linkedin-service]: Add company profile extraction`

#### 3. Pull Request Process

1. **Before Submitting a PR**
   - Ensure all tests pass
   - Update documentation to reflect your changes
   - Verify your code follows the project's style guidelines
   - Add necessary unit tests for new functionality

2. **Creating a Pull Request**
   - Provide a descriptive title and detailed description
   - Link any related issues
   - Explain the problem you're solving
   - Include screenshots or examples if applicable

3. **PR Review Process**
   - Address all review comments
   - Make requested changes and push to your branch
   - Maintain a respectful and collaborative attitude

### Testing Your Changes

#### Running Tests

1. **Unit Tests**
   ```bash
   npm test
   ```

2. **Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **End-to-End Tests**
   ```bash
   npm run test:e2e
   ```

#### Testing Your Service Implementation

When adding a new service or modifying an existing one:

1. **Service Unit Testing**
   ```bash
   npm test -- --grep "YourServiceName"
   ```

2. **Manual API Testing**
   
   Use tools like Postman or cURL to test your endpoints:
   ```bash
   curl -X POST http://localhost:3004/api/your-service/endpoint \
     -H "Content-Type: application/json" \
     -d '{"param1": "value1"}'
   ```

3. **Load Testing**
   ```bash
   npm run test:load
   ```

#### Debugging

1. **Enable Debug Logs**
   Set `LOG_LEVEL=debug` in your `.env` file.

2. **Using Node Inspector**
   ```bash
   node --inspect server.js
   ```
   Then open Chrome and navigate to `chrome://inspect`

3. **Reviewing Application Logs**
   Logs are stored in the `logs/` directory and follow the naming convention `application-YYYY-MM-DD.log`.

### Adding a New Service

To add support for a new RapidAPI service, follow these steps:

1. **Create Service Files**
   - Add a new service file in `services/` directory
   - Create corresponding controller in `controllers/`
   - Add routes in `routes/`

2. **Implement Core Methods**
   Your service should implement at least these methods:
   - API endpoint handlers
   - Service-specific data processing
   - Error handling
   - Response formatting

3. **Test Your Implementation**
   - Write unit tests in the `tests/` directory
   - Manual testing with your own API keys
   - Document usage examples

4. **Update Documentation**
   - Add your service to the "Currently Supported Services" section
   - Document all API endpoints
   - Include example requests and responses

### Examples of Contributions

Here are some ideas for contributions:

- **New Services:** Add support for more RapidAPI services
- **UI Dashboard:** Implement a web-based management dashboard
- **Authentication:** Add user authentication system
- **Monitoring:** Improve usage statistics and monitoring
- **Performance:** Optimize API key rotation algorithms
- **Documentation:** Enhance API documentation or add tutorials

### Code of Conduct

- Be respectful of other contributors
- Provide constructive feedback
- Help maintain a welcoming environment for everyone
- Focus on the issue, not the person

By following these guidelines, you'll help make KeyStream better for everyone. Thank you for your contributions!

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ to help developers maximize their RapidAPI free tier usage.
