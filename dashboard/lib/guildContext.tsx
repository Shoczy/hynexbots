'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type GuildRole = { id: string; name: string; color: number; position: number; managed: boolean };
export type GuildChannel = { id: string; name: string; type: number };
export type Guild = {
  guildId: string;
  guildName: string;
  roles: GuildRole[];
  channels: GuildChannel[];
  syncedAt?: number;
};

type GuildCtx = { roles: GuildRole[]; channels: GuildChannel[]; synced: boolean };

const Ctx = createContext<GuildCtx>({ roles: [], channels: [], synced: false });

export function GuildProvider({ guild, children }: { guild: Guild | null; children: ReactNode }) {
  const value: GuildCtx = {
    roles: guild?.roles ?? [],
    channels: guild?.channels ?? [],
    synced: Boolean(guild && guild.roles.length > 0),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useGuild = () => useContext(Ctx);

// Common Discord channel type ids.
export const CHANNEL_TYPES = { text: [0, 5], voice: [2], category: [4] };
