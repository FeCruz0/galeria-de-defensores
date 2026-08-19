'use client';

import React from 'react';
import CampaignJournalPanel from './CampaignJournalPanel';
import { Profile, Table } from '@/types/game';

interface VttJournalDrawerProps {
  isOpen: boolean;
  savingPublic: boolean;
  publicJournal: string;
  setPublicJournal: (value: string) => void;
  savingPrivate: boolean;
  privateJournal: string;
  setPrivateJournal: (value: string) => void;
  currentUser: Profile | null;
  table: Table | null;
}

export default function VttJournalDrawer({
  isOpen,
  savingPublic,
  publicJournal,
  setPublicJournal,
  savingPrivate,
  privateJournal,
  setPrivateJournal,
  currentUser,
  table,
}: VttJournalDrawerProps) {
  if (!isOpen) return null;

  return (
    <CampaignJournalPanel
      savingPublic={savingPublic}
      publicJournal={publicJournal}
      setPublicJournal={setPublicJournal}
      savingPrivate={savingPrivate}
      privateJournal={privateJournal}
      setPrivateJournal={setPrivateJournal}
      currentUser={currentUser}
      table={table}
    />
  );
}
