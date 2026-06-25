import { BarChart3, Clock3, Settings, Users, Zap } from 'lucide-react';
import { supabase } from '../hooks/useSupabaseDraftState.js';

export function Sidebar({ activePanel, setActivePanel, settingsOpen, setSettingsOpen, syncStatus }) {
  return (
    <aside className="sideNav">
      <div className="logoBadge">
        <img
          className="clubLogo"
          src="/lions-logo.png"
          alt="Lions Club logo"
          onLoad={(event) => { event.currentTarget.nextElementSibling.style.display = 'none'; }}
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
        <div className="logoFallback">
          <div className="logoCircle">L</div>
          <span>Lions<br />International</span>
        </div>
      </div>

      <nav>
        <button className={activePanel === 'draft' ? 'active' : ''} onClick={() => setActivePanel('draft')}><Zap size={18} /> Draft Room</button>
        <button className={activePanel === 'teams' ? 'active' : ''} onClick={() => setActivePanel('teams')}><Users size={18} /> Teams</button>
        <button className={activePanel === 'members' ? 'active' : ''} onClick={() => setActivePanel('members')}><Users size={18} /> Members</button>
        <button className={activePanel === 'history' ? 'active' : ''} onClick={() => setActivePanel('history')}><Clock3 size={18} /> Draft History</button>
        <button className={activePanel === 'analytics' ? 'active' : ''} onClick={() => setActivePanel('analytics')}><BarChart3 size={18} /> Analytics</button>
        <button className={settingsOpen ? 'active' : ''} onClick={() => setSettingsOpen(true)}><Settings size={18} /> Settings</button>
      </nav>

      <div className="syncPanel">
        <strong>{syncStatus === 'Connected' ? '✓ Supabase' : syncStatus}</strong>
        <span>{supabase ? 'Connected' : 'Local mode'}</span>
      </div>
    </aside>
  );
}
