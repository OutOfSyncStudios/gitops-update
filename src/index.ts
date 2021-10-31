import * as core from '@actions/core';
import * as github from '@actions/github';
import { getIntegerInput, getYamlInput } from './util/input';
import retry from 'async-retry';
import _ from 'lodash';
import yaml from 'yaml';
import { parse } from './util/jsonpointer';
import { computeBlobHash } from './util/hash';
import { Endpoints } from '@octokit/types';

type Octokit = ReturnType<typeof github.getOctokit>;
type Tree = Endpoints['POST /repos/{owner}/{repo}/git/trees']['parameters']['tree'];

type Updates = Map<string, Map<string, any>>;

function isFileMode(str: string): str is '100644' | '100755' {
  return str === '100644' || str === '100755';
}

async function getDefaultBranch(octokit: Octokit, owner: string, repo: string): Promise<string> {
  const { data: repository } = await octokit.rest.repos.get({ owner, repo });
  return repository.default_branch;
}

async function commitUpdates(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  updates: Updates
): Promise<string> {
  const ref = `heads/${branch}`;
  let baseRef;
  try {
    const res = await octokit.rest.git.getRef({ owner, repo, ref });
    baseRef = res.data;
  } catch (error) {
    throw new Error(`Could not get base ref ${owner}/${repo}:${ref}: ${error}`);
  }

  // eslint-disable-next-line camelcase -- Github API expects snake case names
  const { data: baseCommit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: baseRef.object.sha });
  core.debug(`Base ref ${baseRef.ref} is at commit ${baseCommit.sha}`);

  const { data: baseTree } = await octokit.rest.git.getTree({
    owner,
    repo,
    // eslint-disable-next-line camelcase -- Github API expects snake case names
    tree_sha: baseCommit.tree.sha,
    recursive: 'true',
  });
  core.debug(`Base tree is at ${baseTree.sha}`);

  const tree: Tree = [];
  for await (const [file, changes] of updates) {
    const previousEntry = _.find(baseTree.tree, { path: file });
    if (!previousEntry) {
      throw new Error('Cannot update non-existent file');
    }
    if (previousEntry.type !== 'blob') {
      throw new Error('Cannot update non-blob tree entry');
    }
    if (!previousEntry.sha) {
      throw new Error('This check exists to please the typescript gods');
    }
    if (!previousEntry.mode || !isFileMode(previousEntry.mode)) {
      throw new Error('This blob has an invalid mode.');
    }

    // eslint-disable-next-line camelcase -- Github API expects snake case names
    const { data: currentBlob } = await octokit.rest.git.getBlob({ owner, repo, file_sha: previousEntry.sha });
    const contents = Buffer.from(currentBlob.content, 'base64').toString('utf8');
    const doc = yaml.parseDocument(contents);
    for (const [pointer, value] of changes) {
      const path = parse(pointer);
      doc.setIn(path, value);
    }
    const newContents = doc.toString();
    const hash = computeBlobHash(newContents);
    if (hash !== currentBlob.sha) {
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(newContents).toString('base64'),
        encoding: 'base64',
      });

      tree.push({
        path: file,
        sha: blob.sha,
        type: 'blob',
        mode: previousEntry.mode,
      });
    } else {
      core.debug(`No changes to commit for ${file}`);
    }
  }

  if (!tree.length) {
    core.info('No changes to commit!');
    return '';
  }

  // Build the new tree
  let newTree;
  try {
    // eslint-disable-next-line camelcase -- Github API expects snake case names
    const res = await octokit.rest.git.createTree({ owner, repo, tree, base_tree: baseTree.sha });
    newTree = res.data;
    core.debug(`Created new tree at ${newTree.sha}`);
  } catch (error) {
    throw Error(`Could not create new tree: ${error}`);
  }

  // Commit the new tree
  let commit;
  try {
    const res = await octokit.rest.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [baseCommit.sha],
    });
    commit = res.data;
    core.info(`Created commit with sha ${commit.sha}`);
  } catch (error) {
    throw Error(`Could not create commit: ${error}`);
  }

  // Update the branch to point at the commmit
  let updatedRef;
  try {
    const res = await octokit.rest.git.updateRef({ owner, repo, ref, sha: commit.sha });
    updatedRef = res.data;
    core.info(`Updated ${baseRef.ref} to ${updatedRef.object.sha}`);
  } catch (error) {
    throw Error(`Could update ref ${ref}: ${error}`);
  }

  return updatedRef.object.sha;
}

async function run(): Promise<void> {
  const token = core.getInput('token');
  const octokit = github.getOctokit(token);

  const [owner, repo] = core.getInput('repo').split('/');
  const branch = core.getInput('branch') || (await getDefaultBranch(octokit, owner, repo));

  let message = core.getInput('message', { required: true });
  const appendRunInfo = core.getBooleanInput('append-run-info');
  if (appendRunInfo) {
    const url = `https://github.com/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`;
    message += `\nCommit made by Github Actions ${url}`;
  }

  const updates: Updates = getYamlInput('updates', { required: true });
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
