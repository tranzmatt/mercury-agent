import { tool } from 'ai';
import { z } from 'zod';
import { githubRequest } from '../../utils/github.js';

export function createGithubApiTool() {
  return tool({
    description: 'Make a raw request to the GitHub API. Use this for any GitHub operation not covered by other tools. GET requests (read-only) are always allowed. Write operations (POST, PUT, PATCH, DELETE) will ask the user for approval via the permission system.',
    parameters: z.object({
      path: z.string().describe('Full API path (e.g., /repos/owner/repo/issues or /user)'),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method').default('GET'),
      body: z.string().describe('JSON body for write requests (as a JSON string)').optional(),
    }),
    execute: async ({ path, method, body }) => {
      try {
        let parsedBody: any;
        if (body) {
          try {
            parsedBody = JSON.parse(body);
          } catch {
            return 'Error: body must be valid JSON.';
          }
        }

        const result = await githubRequest(path, {
          method,
          body: parsedBody,
        });

        if (result === null) return 'Request completed (204 No Content).';

        if (typeof result === 'string') return result;

        return JSON.stringify(result, null, 2);
      } catch (err: any) {
        return `Error: ${err.message}`;
      }
    },
  });
}