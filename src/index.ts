import * as core from '@actions/core';
import * as github from '@actions/github';
import { getIntegerInput, getYamlInput } from './util/input';
import retry from 'async-retry';

type Octokit = ReturnType<typeof github.getOctokit>;

async function commitUpdates(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  updates: any,
): Promise<string> {
  return '';
}

async function run(): Promise<void> {
  const token = core.getInput('token');
  const octokit = github.getOctokit(token);

  const [owner, repo] = core.getInput('repo').split('/');
  const branch = core.getInput('branch');

  let message = core.getInput('message', { required: true });
  const appendRunInfo = core.getBooleanInput('append-run-info');
  if (appendRunInfo) {
    const url = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`;
    message += `\nCommit made by Github Actions ${url}`;
  }

  const updates = getYamlInput('updates', { required: true });
  const retries = getIntegerInput('retries');

  let sha: string;
  try {
    sha = await retry(async () => await commitUpdates(octokit, owner, repo, branch, message, updates), {
      retries,
      onRetry: (err) => {
        core.warning(`Error while performing commit: ${err}`);
      },
    });
  } catch (err) {
    throw new Error(`Could not perform commit after ${retries + 1} attempts: ${err}`);
  }

  core.setOutput('sha', sha);
}

run().catch((err) => core.setFailed(err));
