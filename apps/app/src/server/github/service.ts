import { createGitHubClients } from './client';
import { ISSUE_DETAIL_QUERY, ISSUES_QUERY, PR_DETAIL_QUERY, PULLS_QUERY, REPOS_QUERY, VIEWER_QUERY } from './queries';

export class GitHubService {
  private clients;
  constructor(token: string) { this.clients = createGitHubClients(token); }

  viewer() { return this.clients.graphql(VIEWER_QUERY); }
  repos(first = 50, after?: string) { return this.clients.graphql(REPOS_QUERY, { first, after }); }
  issues(owner: string, repo: string, states: string[] = ['OPEN'], first = 50, after?: string) { return this.clients.graphql(ISSUES_QUERY, { owner, repo, states, first, after }); }
  pulls(owner: string, repo: string, states: string[] = ['OPEN'], first = 50, after?: string) { return this.clients.graphql(PULLS_QUERY, { owner, repo, states, first, after }); }
  issue(owner: string, repo: string, number: number, commentsFirst = 100) { return this.clients.graphql(ISSUE_DETAIL_QUERY, { owner, repo, number, commentsFirst }); }
  pull(owner: string, repo: string, number: number, commentsFirst = 100) { return this.clients.graphql(PR_DETAIL_QUERY, { owner, repo, number, commentsFirst }); }

  async createIssue(owner: string, repo: string, input: { title: string; body?: string; labels?: string[]; assignees?: string[] }) {
    return this.clients.rest.issues.create({ owner, repo, ...input });
  }

  async updateIssue(owner: string, repo: string, issue_number: number, input: { title?: string; body?: string; state?: 'open' | 'closed'; labels?: string[]; assignees?: string[] }) {
    return this.clients.rest.issues.update({ owner, repo, issue_number, ...input });
  }

  async createComment(owner: string, repo: string, issue_number: number, body: string) {
    return this.clients.rest.issues.createComment({ owner, repo, issue_number, body });
  }

  async updateComment(owner: string, repo: string, comment_id: number, body: string) {
    return this.clients.rest.issues.updateComment({ owner, repo, comment_id, body });
  }
}
