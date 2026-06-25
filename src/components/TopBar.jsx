import { Bell, HelpCircle, Settings, Shuffle } from 'lucide-react';

export function TopBar({ randomizeOrder, setSettingsOpen }) {
  return (
    <header className="topBar">
      <button className="outlineBtn" type="button" onClick={randomizeOrder}><Shuffle size={16} /> Start New Draft</button>
      <div className="topIcons">
        <Bell size={20} />
        <HelpCircle size={20} />
        <button className="settingsButton" onClick={() => setSettingsOpen(true)}><Settings size={17} /> Settings</button>
      </div>
    </header>
  );
}
