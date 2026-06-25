import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { STORAGE_KEY, SUPABASE_ROW_ID, SUPABASE_TABLE } from '../constants.js';
import { makeDefaultState, normalizeState } from '../utils/draftLogic.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function loadLocalState() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('lions-club-draft-fantasy') ||
      localStorage.getItem('lions-club-draft-phase-2a');

    return raw ? normalizeState(JSON.parse(raw)) : makeDefaultState();
  } catch {
    return makeDefaultState();
  }
}

export function useSupabaseDraftState() {
  const [state, setState] = useState(loadLocalState);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(supabase ? 'Connecting...' : 'Local only');
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteState() {
      if (!supabase) {
        setRemoteReady(true);
        return;
      }

      setSyncStatus('Loading...');

      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('data')
        .eq('id', SUPABASE_ROW_ID)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setSyncStatus('Supabase load error');
        setRemoteReady(true);
        return;
      }

      if (data?.data) {
        setState(normalizeState(data.data));
        setSyncStatus('Connected');
      } else {
        const localState = loadLocalState();
        setState(localState);

        const { error: insertError } = await supabase
          .from(SUPABASE_TABLE)
          .upsert({ id: SUPABASE_ROW_ID, data: localState, updated_at: new Date().toISOString() });

        setSyncStatus(insertError ? 'Supabase save error' : 'Connected');
      }

      setRemoteReady(true);
    }

    loadRemoteState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    if (!supabase || !remoteReady) return;

    clearTimeout(saveTimer.current);
    setSyncStatus('Saving...');

    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });

      setSyncStatus(error ? 'Supabase save error' : 'Connected');
    }, 650);
  }, [state, remoteReady]);

  const forceSave = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    if (!supabase) {
      setSyncStatus('Saved locally');
      return;
    }

    setSyncStatus('Saving...');

    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() });

    setSyncStatus(error ? 'Supabase save error' : 'Connected');
  };

  return {
    state,
    setState,
    syncStatus,
    forceSave,
  };
}
