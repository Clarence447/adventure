export function passwordHash(password: string, salt?: string): string;
export function createInbox(options: {path:string;credential:string;origin:string;now?:()=>number}): {handle(request:Request):Promise<Response>;authenticated(cookie:string|null):boolean;close():void};
export function configuredInbox(): ReturnType<typeof createInbox>;
