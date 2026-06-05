export type DeleteAction = (id: string) => Promise<{ error?: string; success?: boolean }>;
