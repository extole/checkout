import * as core from '@actions/core'
import * as gitAuthHelper from '../lib/git-auth-helper'
import * as gitCommandManager from '../lib/git-command-manager'
import * as githubApiHelper from '../lib/github-api-helper'
import * as io from '@actions/io'
import * as path from 'path'
import * as refHelper from '../lib/ref-helper'
import {GitVersion} from '../lib/git-version'
import {IGitCommandManager} from '../lib/git-command-manager'
import {IGitSourceSettings} from '../lib/git-source-settings'
import {getSource} from '../lib/git-source-provider'

const testWorkspace = path.join(__dirname, '_temp', 'git-source-provider')
const repositoryUrl = 'https://github.com/my-org/my-repo'
let git: IGitCommandManager
let settings: IGitSourceSettings

describe('git-source-provider tests', () => {
  beforeAll(async () => {
    await io.rmRF(testWorkspace)
  })

  beforeEach(() => {
    jest.spyOn(core, 'error').mockImplementation(jest.fn())
    jest.spyOn(core, 'warning').mockImplementation(jest.fn())
    jest.spyOn(core, 'info').mockImplementation(jest.fn())
    jest.spyOn(core, 'debug').mockImplementation(jest.fn())
    jest.spyOn(core, 'startGroup').mockImplementation(jest.fn())
    jest.spyOn(core, 'endGroup').mockImplementation(jest.fn())
    jest.spyOn(core, 'saveState').mockImplementation(jest.fn())
    jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())
    jest
      .spyOn(githubApiHelper, 'getDefaultBranch')
      .mockRejectedValue(new Error('API rate limit exceeded'))
    jest.spyOn(refHelper, 'checkCommitInfo').mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const fallsBackToDefaultBranchWithGit =
    'falls back to the default branch with git when the ref does not exist'
  it(fallsBackToDefaultBranchWithGit, async () => {
    await setup(fallsBackToDefaultBranchWithGit)
    settings.ref = 'missing-branch'

    await getSource(settings)

    expect(git.getDefaultBranch).toHaveBeenCalledWith(repositoryUrl)
    expect(githubApiHelper.getDefaultBranch).not.toHaveBeenCalled()
    expect(git.checkout).toHaveBeenCalledWith(
      'main',
      'refs/remotes/origin/main'
    )
  })

  const resolvesRefWithGit =
    'resolves the ref with git when neither ref nor commit is given'
  it(resolvesRefWithGit, async () => {
    await setup(resolvesRefWithGit)

    await getSource(settings)

    expect(git.getDefaultBranch).toHaveBeenCalledTimes(1)
    expect(githubApiHelper.getDefaultBranch).not.toHaveBeenCalled()
    expect(git.checkout).toHaveBeenCalledWith(
      'main',
      'refs/remotes/origin/main'
    )
  })
})

async function setup(testName: string): Promise<void> {
  testName = testName.replace(/[^a-zA-Z0-9_]+/g, '-')
  const repositoryPath = path.join(testWorkspace, testName)

  git = {
    branchDelete: jest.fn(),
    branchExists: jest.fn(async () => false),
    branchList: jest.fn(async () => []),
    disableSparseCheckout: jest.fn(),
    sparseCheckout: jest.fn(),
    sparseCheckoutNonConeMode: jest.fn(),
    checkout: jest.fn(),
    checkoutDetach: jest.fn(),
    config: jest.fn(),
    configExists: jest.fn(),
    fetch: jest.fn(),
    getDefaultBranch: jest.fn(async () => 'refs/heads/main'),
    getSubmoduleConfigPaths: jest.fn(async () => []),
    getWorkingDirectory: jest.fn(() => repositoryPath),
    init: jest.fn(),
    isDetached: jest.fn(),
    lfsFetch: jest.fn(),
    lfsInstall: jest.fn(),
    log1: jest.fn(async () => ''),
    remoteAdd: jest.fn(),
    removeEnvironmentVariable: jest.fn(),
    revParse: jest.fn(),
    setEnvironmentVariable: jest.fn(),
    shaExists: jest.fn(),
    submoduleForeach: jest.fn(),
    submoduleSync: jest.fn(),
    submoduleUpdate: jest.fn(),
    submoduleStatus: jest.fn(async () => true),
    tagExists: jest.fn(async () => false),
    tryClean: jest.fn(async () => true),
    tryConfigUnset: jest.fn(),
    tryConfigUnsetValue: jest.fn(),
    tryDisableAutomaticGarbageCollection: jest.fn(async () => true),
    tryGetFetchUrl: jest.fn(async () => repositoryUrl),
    tryGetConfigValues: jest.fn(),
    tryGetConfigKeys: jest.fn(),
    tryReset: jest.fn(async () => true),
    version: jest.fn(async () => new GitVersion('2.55.0'))
  }
  jest.spyOn(gitCommandManager, 'createCommandManager').mockResolvedValue(git)
  jest.spyOn(gitAuthHelper, 'createAuthHelper').mockReturnValue({
    configureAuth: jest.fn(),
    configureGlobalAuth: jest.fn(),
    configureSubmoduleAuth: jest.fn(),
    configureTempGlobalConfig: jest.fn(async () => ''),
    removeAuth: jest.fn(),
    removeGlobalConfig: jest.fn()
  })

  settings = {
    repositoryPath,
    repositoryOwner: 'my-org',
    repositoryName: 'my-repo',
    ref: '',
    defaultRefOnError: true,
    defaultBranch: '',
    commit: '',
    clean: true,
    filter: undefined,
    sparseCheckout: [],
    sparseCheckoutConeMode: true,
    fetchDepth: 0,
    fetchTags: false,
    showProgress: false,
    lfs: false,
    submodules: false,
    nestedSubmodules: false,
    authToken: 'token',
    sshKey: '',
    sshKnownHosts: '',
    sshStrict: true,
    sshUser: '',
    persistCredentials: false,
    workflowOrganizationId: undefined,
    setSafeDirectory: false,
    githubServerUrl: undefined
  }
}
