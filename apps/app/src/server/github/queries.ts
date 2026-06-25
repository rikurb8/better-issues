export const VIEWER_QUERY = `query Viewer { viewer { login name avatarUrl url } }`;

export const REPOS_QUERY = `
query Repos($first: Int!, $after: String) {
  viewer {
    repositories(first: $first, after: $after, orderBy: {field: PUSHED_AT, direction: DESC}, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      pageInfo { hasNextPage endCursor }
      nodes { id name nameWithOwner description isPrivate url pushedAt owner { login avatarUrl } }
    }
  }
}`;

export const ISSUES_QUERY = `
query Issues($owner: String!, $repo: String!, $first: Int!, $after: String, $states: [IssueState!]) {
  repository(owner: $owner, name: $repo) {
    issues(first: $first, after: $after, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes { id number title state url updatedAt comments { totalCount } labels(first: 10) { nodes { name color } } author { login avatarUrl } assignees(first: 5) { nodes { login avatarUrl } } }
    }
  }
}`;

export const PULLS_QUERY = `
query Pulls($owner: String!, $repo: String!, $first: Int!, $after: String, $states: [PullRequestState!]) {
  repository(owner: $owner, name: $repo) {
    pullRequests(first: $first, after: $after, states: $states, orderBy: {field: UPDATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes { id number title state url updatedAt isDraft comments { totalCount } reviewDecision author { login avatarUrl } labels(first: 10) { nodes { name color } } assignees(first: 5) { nodes { login avatarUrl } } }
    }
  }
}`;

export const ISSUE_DETAIL_QUERY = `
query IssueDetail($owner: String!, $repo: String!, $number: Int!, $commentsFirst: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) { id number title body state url updatedAt createdAt author { login avatarUrl } labels(first: 20) { nodes { name color } } assignees(first: 10) { nodes { login avatarUrl } } comments(first: $commentsFirst) { nodes { id databaseId body author { login avatarUrl } createdAt updatedAt url } } }
  }
}`;

export const PR_DETAIL_QUERY = `
query PullDetail($owner: String!, $repo: String!, $number: Int!, $commentsFirst: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) { id number title body state url updatedAt createdAt isDraft reviewDecision baseRefName headRefName author { login avatarUrl } labels(first: 20) { nodes { name color } } assignees(first: 10) { nodes { login avatarUrl } } comments(first: $commentsFirst) { nodes { id databaseId body author { login avatarUrl } createdAt updatedAt url } } reviews(first: 20) { nodes { id body state author { login avatarUrl } createdAt updatedAt url comments(first: 20) { nodes { body path line author { login avatarUrl } createdAt url } } } } commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } }
  }
}`;
