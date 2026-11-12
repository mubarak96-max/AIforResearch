# Managed Team seats

Team seats build on the existing Team plan, `accounts.team_seats`, and pooled credits. The feature does not provision paid plans, change prices or seat quantities, migrate subscriptions, or send invitation emails. No live Team account has been provisioned as part of this implementation.

## Enable an existing Team

1. Provision the Team entitlement through the existing operational billing process. Its effective plan must already be Team; the application does not expose a new paid-plan grant.
2. A verified platform administrator opens Account → Team seats → Platform administration and supplies the existing billing account ID and an existing verified member’s user ID.
3. That member becomes the Team owner. Existing members of that billing account become ordinary members. The current roster must fit the provisioned seat cap. The existing three-seat minimum is retained.
4. The owner can designate additional owners or administrators. At least one active verified owner must remain. Owners manage roles; administrators can invite users and remove ordinary member seats.

The setup endpoint is `POST /api/team/activate`. It requires the caller’s current stored platform-admin flag and verified email, an existing active Team entitlement, and an eligible existing owner. Setup never changes entitlement or billing fields.

## Invite and accept

Administrators invite an existing verified account by email. The invitation appears in the recipient’s Account page and expires after seven days. Invitations do not reserve seats. Acceptance rereads the invitation, membership, provisioned Team plan, personal account and occupied seats in one transaction; two successful accepts cannot allocate the same final seat.

The recipient must explicitly accept. An account with a paid plan, subscription, personal top-up balance or Dodo customer history cannot move through this flow. The customer-history guard also covers unfinished checkouts that have not produced a webhook. Such accounts require support review; this feature does not cancel, merge or move their payments.

An eligible personal account is retained, including its credit-usage history. Joining changes the user’s current billing account and records the personal account for restoration.

Customer creation rechecks a reserved personal account transactionally before starting checkout. If invitation acceptance moved its user while the payment provider was responding, the old personal checkout is refused; an unused provider customer may have been created, but no checkout or charge is started.

## Permissions and leaving

Team membership provides shared billing, not implicit access to research. Project roles, document invitations, Library ownership and saved work remain independent. Leaving a Team does not remove existing project or document invitations; administrators manage those permissions where the material is shared.

Removal restores the reserved personal billing account, or creates a Free personal account for a member who belonged to the Team before seat management existed. It does not delete research, alter other members’ accounts, cancel subscriptions or move Team credits. Cached token verification is retained. The user record is re-read at most every 10 seconds per signed-in token; changes on the same server instance apply immediately, and on other instances within 10 seconds.

Members can view pooled usage. Only Team owners and administrators can view billing records or operate payment settings. Managed Team plan changes and Defence Pass purchases are blocked in self-service checkout; seat and plan changes continue through the existing Team agreement. New billing-customer creation uses an explicitly designated active owner; existing payment customers remain unchanged.

Account deletion calls `prepareTeamAccountDeletion` before reading the user’s billing account or deleting data. From Account → Delete (`DELETE /api/auth/me`) the helper detaches the membership transactionally and refuses (409) to remove the last active owner or an unreconciled membership, so the person can resolve it first. Deletion then operates on the restored personal account.

When the Firebase Auth user is deleted elsewhere (the console, or the `onUserDeleted` trigger), nobody can resolve a 409, so cleanup is forced: the person is removed from the roster, their personal account is restored only when that is safe, and cleanup continues. If they were the last active owner, the Team is flagged `needs_owner` and an `owner_needed` event is recorded; a verified platform administrator then assigns an existing verified member as owner with `POST /api/team/recover-owner` (`{ account_id, owner_user_id }`). That endpoint refuses while an active owner exists. There is no settings UI for it yet.

Invitations the departing person received are removed. Pending invitations they sent are revoked; decided ones (accepted, declined, revoked) stay as part of the Team’s audit trail. When the last user of an account is deleted, the account, its `team_events` and all of its invitations are removed.

`team_events` intentionally keep `actor_id` and `target_id` after a member deletes their account, so the Team’s membership history stays complete. They hold user ids and roles only — no names, emails or research content.

Deletion preparation also marks the user with `deletion_pending_at`, preventing invitation acceptance and Team administration while cleanup runs. While it is set, the person is signed out of every API except account deletion itself, so a failed cleanup can be retried. An inconsistent managed roster blocks deletion before any destructive cleanup; it needs administrator reconciliation. A successfully detached user cannot rejoin a Team midway through cleanup.

## Audit and validation

Team mutations append membership events under `accounts/{id}/team_events`. Account settings display the latest 100 events; `/api/team/export` exports all events, the current roster and invitation history for a current owner or administrator. It does not export payment-provider credentials or research content.

Targeted tests cover provisioning prerequisites, verified acceptance, seat capacity, expired/revoked invitations, role permissions, last-owner protection including account deletion, personal-data retention, billing-history protection, private billing records, full audit export and fresh billing identity with cached token verification. Tests use the repository’s Firestore test double; deployment should additionally exercise concurrent final-seat acceptance against a Firestore emulator or staging account.
