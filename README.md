# MCP Google Play Store Server

An MCP (Model Context Protocol) server that provides Google Play Store command line tools integration for AI assistants like Claude.

## Features

- App listing management
- Release management
- Store listing updates
- Review responses
- Statistics and reporting
- Secure credential handling

## Installation

```bash
npm install -g @blocktopus/mcp-google-play
```

## Usage

### Configuration

1. Create a Google Cloud service account with Play Console API access
2. Download the service account JSON key file
3. Use one of these methods to provide the API key:

#### Method 1: Command Line Argument (Recommended)
```bash
npx @blocktopus/mcp-google-play --api-key /path/to/service-account-key.json
```

#### Method 2: Environment Variable
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
npx @blocktopus/mcp-google-play
```

### With Claude Desktop

Add to your Claude desktop configuration:

```json
{
  "mcpServers": {
    "google-play": {
      "command": "npx",
      "args": [
        "@blocktopus/mcp-google-play",
        "--api-key",
        "/path/to/service-account-key.json"
      ]
    }
  }
}
```

Or using environment variable:

```json
{
  "mcpServers": {
    "google-play": {
      "command": "npx",
      "args": ["@blocktopus/mcp-google-play"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account-key.json"
      }
    }
  }
}
```

### Available Tools

- `list_apps` - List all apps in your Play Console
- `get_app_info` - Get detailed information about an app
- `list_releases` - List releases for an app
- `create_release` - Create a new release
- `update_listing` - Update store listing information
- `get_reviews` - Get app reviews
- `reply_to_review` - Reply to a user review
- `get_statistics` - Get app statistics and metrics

## Development

```bash
# Clone the repository
git clone https://github.com/BlocktopusLtd/mcp-google-play.git
cd mcp-google-play

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## Security

- Never commit service account credentials
- Use environment variables for sensitive data
- Follow Google Play API best practices
- Respect API rate limits

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
