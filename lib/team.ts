export type TeamRole = 'owner' | 'admin' | 'member';
export type TeamMembership = { role: TeamRole; joined_at: string; personal_account_id: string | null };
export type TeamGovernance = { version: 1; revision: number; activated_at: string; activated_by: string; members: Record<string, TeamMembership>;
  /** Set when the last owner's account was deleted; a platform administrator assigns a new owner. */
  needs_owner?: boolean;
};
export type TeamInvitation = { id: string; account_id: string; account_name: string; target_user_id: string; target_email: string; invited_by: string; status: 'pending' | 'accepted' | 'declined' | 'revoked'; created_at: string; expires_at: string; decided_at: string | null };
export type TeamEvent = { id: string; at: string; action: string; actor_id: string; target_id: string | null; role: TeamRole | null };
export type TeamSummary = { account_id: string; name: string; role: TeamRole | null; seats: number; used: number; revision: number; active_plan: boolean; needs_owner: boolean; members: { user_id: string; name: string; email: string; role: TeamRole; active: boolean }[]; invitations: TeamInvitation[]; events: TeamEvent[] };
export type TeamSettings = { team: TeamSummary | null; invitations: TeamInvitation[]; platform_admin: boolean; unconfigured_team: boolean };
