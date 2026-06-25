import { BarChart3, Clock3, Home, Settings, Users, Zap } from 'lucide-react';
import { supabase } from '../hooks/useSupabaseDraftState.js';

export function Sidebar({ activePanel, setActivePanel, settingsOpen, setSettingsOpen, syncStatus }) {
  return (
    <aside className="sideNav dashboardSideNav">
      <div className="logoBadge hostLogoBlock">
        <img
          className="clubLogo"
          src="/lions-logo.png"
          alt="Lufkin Host Lions Club logo"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
        <span className="hostClubText">Lufkin Host<br />Lions Club</span>
      </div>

      <nav>
        <button className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}><Home size={18} /> Dashboard</button>
        <button className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}><Zap size={18} /> Draft Room</button>
        <button className={activePanel === 'teams' ? 'active' : ''} onClick={() => setActivePanel('teams')}><Users size={18} /> Teams</button>
        <button className={activePanel === 'members' ? 'active' : ''} onClick={() => setActivePanel('members')}><Users size={18} /> Members</button>
        <button className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')}><Clock3 size={18} /> Draft History</button>
        <button className={settingsOpen ? 'active' : ''} onClick={() => setSettingsOpen(true)}><Settings size={18} /> Settings</button>
        <button className={activePanel === 'analytics' ? 'active' : ''} onClick={() => setActivePanel('analytics')}><BarChart3 size={18} /> Analytics</button>
      </nav>

      <div className="syncPanel">
        <strong>{syncStatus === 'Connected' ? '● Live Draft Active' : syncStatus}</strong>
        <span>{supabase ? 'Supabase Connected' : 'Local mode'}</span>
      </div>
    </aside>
  );
}
