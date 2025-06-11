#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';

// Initialize Google Auth
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/androidpublisher']
});

// Initialize Play Developer API
const androidpublisher = google.androidpublisher('v3');

// Tool schemas
const ListAppsSchema = z.object({});

const GetAppInfoSchema = z.object({
  packageName: z.string().describe('The package name of the app (e.g., com.example.app)')
});

const ListReleasesSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  track: z.enum(['internal', 'alpha', 'beta', 'production']).describe('The release track')
});

const GetReviewsSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  maxResults: z.number().optional().default(10).describe('Maximum number of reviews to return')
});

// Create MCP server
const server = new Server(
  {
    name: 'google-play',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_apps',
        description: 'List all apps in your Google Play Console',
        inputSchema: ListAppsSchema,
      },
      {
        name: 'get_app_info',
        description: 'Get detailed information about a specific app',
        inputSchema: GetAppInfoSchema,
      },
      {
        name: 'list_releases',
        description: 'List releases for an app in a specific track',
        inputSchema: ListReleasesSchema,
      },
      {
        name: 'get_reviews',
        description: 'Get recent reviews for an app',
        inputSchema: GetReviewsSchema,
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Authenticate
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    switch (name) {
      case 'list_apps': {
        // Note: The Play Developer API doesn't have a direct "list all apps" endpoint
        // This would typically require knowing package names beforehand
        return {
          content: [
            {
              type: 'text',
              text: 'To list apps, you need to provide package names. The Play Developer API requires knowing package names in advance.',
            },
          ],
        };
      }

      case 'get_app_info': {
        const { packageName } = GetAppInfoSchema.parse(args);
        
        const response = await androidpublisher.edits.insert({
          packageName,
        });
        
        const editId = response.data.id;
        
        // Get app details
        const appDetails = await androidpublisher.edits.details.get({
          packageName,
          editId: editId!,
        });
        
        // Delete the edit (we're just reading)
        await androidpublisher.edits.delete({
          packageName,
          editId: editId!,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(appDetails.data, null, 2),
            },
          ],
        };
      }

      case 'list_releases': {
        const { packageName, track } = ListReleasesSchema.parse(args);
        
        const response = await androidpublisher.edits.insert({
          packageName,
        });
        
        const editId = response.data.id;
        
        // Get track information
        const trackInfo = await androidpublisher.edits.tracks.get({
          packageName,
          editId: editId!,
          track,
        });
        
        // Delete the edit
        await androidpublisher.edits.delete({
          packageName,
          editId: editId!,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(trackInfo.data, null, 2),
            },
          ],
        };
      }

      case 'get_reviews': {
        const { packageName, maxResults } = GetReviewsSchema.parse(args);
        
        const reviews = await androidpublisher.reviews.list({
          packageName,
          maxResults,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(reviews.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Google Play server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
