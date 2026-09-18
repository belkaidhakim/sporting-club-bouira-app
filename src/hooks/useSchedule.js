import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useSchedule() {
  const [schedule, setSchedule] = useState(() => {
    try {
      const localVal = localStorage.getItem('scb_weekly_schedule');
      return localVal ? JSON.parse(localVal) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_settings')
        .select('*')
        .eq('key', 'weekly_schedule')
        .maybeSingle();

      if (!error && data && Array.isArray(data.value)) {
        setSchedule(data.value);
        localStorage.setItem('scb_weekly_schedule', JSON.stringify(data.value));
      }
    } catch (e) {
      console.warn("Could not fetch remote schedule, using local fallback.", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const updateSchedule = async (newSchedule) => {
    const updated = Array.isArray(newSchedule) ? newSchedule : [];
    setSchedule(updated);
    localStorage.setItem('scb_weekly_schedule', JSON.stringify(updated));

    try {
      const { error } = await supabase
        .from('club_settings')
        .upsert({
          key: 'weekly_schedule',
          value: updated
        });
      
      if (error && error.code !== '42P01') {
         console.warn('Erreur sauvegarde Supabase schedule:', error);
      }
    } catch (e) {
      console.warn('Warning sync schedule:', e);
    }
  };

  const addSession = async (sessionData) => {
    const newSession = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      ...sessionData
    };
    const updated = [...schedule, newSession];
    await updateSchedule(updated);
    toast.success('Créneau ajouté au planning');
  };

  const editSession = async (id, updatedData) => {
    const updated = schedule.map(s => s.id === id ? { ...s, ...updatedData } : s);
    await updateSchedule(updated);
    toast.success('Créneau modifié');
  };

  const deleteSession = async (id) => {
    const updated = schedule.filter(s => s.id !== id);
    await updateSchedule(updated);
    toast.success('Créneau supprimé');
  };

  return {
    schedule,
    loading,
    fetchSchedule,
    updateSchedule,
    addSession,
    editSession,
    deleteSession
  };
}
