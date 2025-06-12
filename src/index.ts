#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// Get API key from command line arguments or environment
const args = process.argv.slice(2);
let apiKeyPath: string | undefined;

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && i + 1 < args.length) {
    apiKeyPath = args[i + 1];
    break;
  }
}

// Fall back to environment variable if not provided via CLI
if (!apiKeyPath) {
  apiKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

if (!apiKeyPath) {
  console.error('Error: No API key provided. Use --api-key <path> or set GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}

// Initialize Google Auth with the provided key
let auth: GoogleAuth;
let androidpublisher: any;

// Initialize auth and API in an async function
async function initializeAuth() {
  try {
    // Verify the file exists
    await fs.access(apiKeyPath!);
    
    auth = new GoogleAuth({
      keyFile: apiKeyPath!,
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    
    // Initialize Play Developer API
    androidpublisher = google.androidpublisher('v3');
  } catch (error) {
    console.error(`Error: Cannot access API key file at ${apiKeyPath}`);
    process.exit(1);
  }
}

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

const ReplyToReviewSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  reviewId: z.string().describe('The ID of the review to reply to'),
  replyText: z.string().describe('The reply text to post')
});

const UpdateListingSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  language: z.string().describe('Language code (e.g., en-US)'),
  title: z.string().optional().describe('App title'),
  shortDescription: z.string().optional().describe('Short description'),
  fullDescription: z.string().optional().describe('Full description'),
  video: z.string().optional().describe('YouTube video URL')
});

const GetListingSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  language: z.string().describe('Language code (e.g., en-US)')
});

const CreateReleaseSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  track: z.enum(['internal', 'alpha', 'beta', 'production']).describe('The release track'),
  versionCode: z.number().describe('Version code of the APK/AAB to release'),
  releaseNotes: z.string().optional().describe('Release notes for this version'),
  userFraction: z.number().optional().describe('Fraction of users to get update (0.0-1.0)')
});

const GetStatisticsSchema = z.object({
  packageName: z.string().describe('The package name of the app'),
  metric: z.enum(['installs', 'ratings', 'crashes']).describe('Type of statistics to retrieve')
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
      {
        name: 'reply_to_review',
        description: 'Reply to a user review',
        inputSchema: ReplyToReviewSchema,
      },
      {
        name: 'get_listing',
        description: 'Get store listing information for an app',
        inputSchema: GetListingSchema,
      },
      {
        name: 'update_listing',
        description: 'Update store listing information',
        inputSchema: UpdateListingSchema,
      },
      {
        name: 'create_release',
        description: 'Create a new release for an app',
        inputSchema: CreateReleaseSchema,
      },
      {
        name: 'get_statistics',
        description: 'Get app statistics (installs, ratings, crashes)',
        inputSchema: GetStatisticsSchema,
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

      case 'reply_to_review': {
        const { packageName, reviewId, replyText } = ReplyToReviewSchema.parse(args);
        
        const result = await androidpublisher.reviews.reply({
          packageName,
          reviewId,
          requestBody: {
            replyText,
          },
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully replied to review ${reviewId}`,
            },
          ],
        };
      }

      case 'get_listing': {
        const { packageName, language } = GetListingSchema.parse(args);
        
        const response = await androidpublisher.edits.insert({
          packageName,
        });
        
        const editId = response.data.id;
        
        // Get listing details
        const listing = await androidpublisher.edits.listings.get({
          packageName,
          editId: editId!,
          language,
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
              text: JSON.stringify(listing.data, null, 2),
            },
          ],
        };
      }

      case 'update_listing': {
        const { packageName, language, title, shortDescription, fullDescription, video } = UpdateListingSchema.parse(args);
        
        const response = await androidpublisher.edits.insert({
          packageName,
        });
        
        const editId = response.data.id;
        
        // Update listing
        const updateData: any = {};
        if (title) updateData.title = title;
        if (shortDescription) updateData.shortDescription = shortDescription;
        if (fullDescription) updateData.fullDescription = fullDescription;
        if (video) updateData.video = video;
        
        await androidpublisher.edits.listings.update({
          packageName,
          editId: editId!,
          language,
          requestBody: updateData,
        });
        
        // Commit the edit
        const commitResult = await androidpublisher.edits.commit({
          packageName,
          editId: editId!,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated ${language} listing for ${packageName}`,
            },
          ],
        };
      }

      case 'create_release': {
        const { packageName, track, versionCode, releaseNotes, userFraction } = CreateReleaseSchema.parse(args);
        
        const response = await androidpublisher.edits.insert({
          packageName,
        });
        
        const editId = response.data.id;
        
        // Create release
        const releaseData: any = {
          versionCodes: [versionCode],
          status: userFraction && userFraction < 1 ? 'inProgress' : 'completed',
        };
        
        if (releaseNotes) {
          releaseData.releaseNotes = [{
            language: 'en-US',
            text: releaseNotes,
          }];
        }
        
        if (userFraction) {
          releaseData.userFraction = userFraction;
        }
        
        await androidpublisher.edits.tracks.update({
          packageName,
          editId: editId!,
          track,
          requestBody: {
            track,
            releases: [releaseData],
          },
        });
        
        // Commit the edit
        const commitResult = await androidpublisher.edits.commit({
          packageName,
          editId: editId!,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created release for version ${versionCode} on ${track} track`,
            },
          ],
        };
      }

      case 'get_statistics': {
        const { packageName, metric } = GetStatisticsSchema.parse(args);
        
        // Note: Statistics require different API endpoints based on metric
        // This is a simplified example
        let result: string;
        
        switch (metric) {
          case 'installs':
            // This would typically use the Reports API
            result = 'Install statistics would be retrieved from Play Console Reports API';
            break;
          case 'ratings':
            // Get app details which includes ratings
            const response = await androidpublisher.edits.insert({
              packageName,
            });
            const editId = response.data.id;
            const appDetails = await androidpublisher.edits.details.get({
              packageName,
              editId: editId!,
            });
            await androidpublisher.edits.delete({
              packageName,
              editId: editId!,
            });
            result = JSON.stringify({
              appDetails: appDetails.data,
              note: 'For detailed statistics, use Play Console Reports API',
            }, null, 2);
            break;
          case 'crashes':
            result = 'Crash statistics would be retrieved from Play Console Vitals API';
            break;
          default:
            result = 'Unknown metric';
        }
        
        return {
          content: [
            {
              type: 'text',
              text: result,
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
  await initializeAuth();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Google Play server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
