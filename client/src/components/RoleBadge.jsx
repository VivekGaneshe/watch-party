const LABELS = { host: "Host", moderator: "Moderator", participant: "Participant" };

export default function RoleBadge({ role }) {
  if (!role) return null;
  return <span className={`badge badge-${role}`}>{LABELS[role] || role}</span>;
}