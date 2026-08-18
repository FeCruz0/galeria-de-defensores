import { useState, useEffect } from 'react';

export function useVttSession(initialUserRole: 'MASTER' | 'PLAYER' | 'SPECTATOR' | 'GUEST') {
  const [userRole, setUserRole] = useState<'MASTER' | 'PLAYER' | 'SPECTATOR' | 'GUEST'>(initialUserRole);
  const [chatCooldownRemaining, setChatCooldownRemaining] = useState<number>(0);
  const [rollCooldownRemaining, setRollCooldownRemaining] = useState<number>(0);

  // Timers para Cooldown de Anti-Abuso de Chat
  useEffect(() => {
    if (chatCooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setChatCooldownRemaining((prev) => (prev > 0.1 ? Number((prev - 0.1).toFixed(1)) : 0));
    }, 100);
    return () => clearInterval(interval);
  }, [chatCooldownRemaining]);

  // Timers para Cooldown de Anti-Abuso de Rolagem
  useEffect(() => {
    if (rollCooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setRollCooldownRemaining((prev) => (prev > 0.1 ? Number((prev - 0.1).toFixed(1)) : 0));
    }, 100);
    return () => clearInterval(interval);
  }, [rollCooldownRemaining]);

  const triggerChatCooldown = () => setChatCooldownRemaining(1);
  const triggerRollCooldown = () => setRollCooldownRemaining(1);

  const isSpectator = userRole === 'SPECTATOR' || userRole === 'GUEST';

  return {
    userRole,
    setUserRole,
    chatCooldownRemaining,
    setChatCooldownRemaining,
    rollCooldownRemaining,
    setRollCooldownRemaining,
    triggerChatCooldown,
    triggerRollCooldown,
    isSpectator
  };
}
