import type { Server } from 'node:http';
export function passwordHash(password: string, salt?: string): string;
export function createInbox(options: {path:string;credential:string;origin:string;now?:()=>number}): Server;
