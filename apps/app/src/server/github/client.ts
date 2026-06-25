import { graphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';

export type GitHubClients = {
  graphql: typeof graphql;
  rest: Octokit;
};

export function createGitHubClients(token: string): GitHubClients {
  if (!token) throw new Error('Missing GitHub token');
  return {
    graphql: graphql.defaults({ headers: { authorization: `token ${token}` } }),
    rest: new Octokit({ auth: token }),
  };
}

export function getToken(explicit?: string) {
  return explicit || process.env.GITHUB_TOKEN || '';
}
