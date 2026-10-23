import { agentCapabilities } from './capabilities.js';
import type { RuntimeAgentDef } from './types.js';

export const OPENCODE_SKIP_PERMISSIONS_FLAG = '--dangerously-skip-permissions';
// OpenCode 1.19 renamed the bypass flag to `--auto` ("auto-approve permissions
// that are not explicitly denied") and dropped the old spelling.
export const OPENCODE_AUTO_APPROVE_FLAG = '--auto';
export const OPENCODE_WORKSPACE_DIR_FLAG = '--dir';

export const OPENCODE_PERMISSION_CAPABILITY = {
  helpArgs: ['run', '--help'],
  capabilityFlags: {
    [OPENCODE_SKIP_PERMISSIONS_FLAG]: 'skipPermissions',
    [OPENCODE_AUTO_APPROVE_FLAG]: 'autoApprovePermissions',
  },
} satisfies Pick<RuntimeAgentDef, 'helpArgs' | 'capabilityFlags'>;

/**
 * Non-interactive `opencode run` auto-rejects every permission it would ask
 * for, including `external_directory` reads of a linked folder outside the
 * project. Pass whichever bypass spelling the installed build advertises,
 * preferring the original flag when both are present.
 */
export function appendOpenCodePermissionBypass(args: string[], agentId: string): void {
  const caps = agentCapabilities.get(agentId);
  if (caps?.skipPermissions) {
    args.push(OPENCODE_SKIP_PERMISSIONS_FLAG);
  } else if (caps?.autoApprovePermissions) {
    args.push(OPENCODE_AUTO_APPROVE_FLAG);
  }
}

/**
 * Pin OpenCode's workspace to the resolved project directory.
 *
 * OpenCode does not treat its process cwd as the project: it walks up to the
 * nearest enclosing git root and adopts THAT as the worktree (verified with
 * `opencode debug scrap`, whose every registered project is a git root). A
 * managed project directory is not a git repository, and a development install
 * keeps the daemon data directory under the repository root — so OpenCode walks
 * past the project and adopts the whole Open Design checkout.
 *
 * The consequences are all silent: the agent names the repository root as its
 * workspace and writes the deliverable there, the project directory stays
 * empty, `snapshotProjectArtifactsAsync(cwd)` sees nothing, and the Run reports
 * `no_artifact`. `permission.external_directory` cannot catch it either — once
 * the repository is the worktree, writing inside it is an in-project write.
 *
 * Sent unconditionally, matching the BYOK OpenCode definition that already
 * carried this workaround. Gating it on the `--help` capability probe would
 * turn a missing flag back into the silent data-loss bug; an OpenCode build
 * without `--dir` should fail loudly at spawn instead.
 */
export function appendOpenCodeWorkspaceDir(
  args: string[],
  cwd: string | null | undefined,
): void {
  if (typeof cwd !== 'string' || cwd.length === 0) return;
  args.push(OPENCODE_WORKSPACE_DIR_FLAG, cwd);
}
