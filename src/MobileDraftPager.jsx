import { BarChart3, Star, Trophy } from 'lucide-react';

export function SummaryStrip({ strongestTeam, weakestTeam, balancedTeam }) {
  return (
    <section className="summaryStrip">
      <div><Trophy size={24} /><span>Strongest Team</span><b>{strongestTeam ? `${strongestTeam.team.name} (${strongestTeam.avg.toFixed(1)})` : '—'}</b></div>
      <div><Star size={24} /><span>Most Balanced</span><b>{balancedTeam ? `${balancedTeam.team.name} (${balancedTeam.avg.toFixed(1)})` : '—'}</b></div>
      <div><BarChart3 size={24} /><span>Weakest Team</span><b>{weakestTeam ? `${weakestTeam.team.name} (${weakestTeam.avg.toFixed(1)})` : '—'}</b></div>
    </section>
  );
}
