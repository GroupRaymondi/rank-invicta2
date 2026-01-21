import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatName(fullName: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0] || '';
    return `${parts[0]} ${parts[parts.length - 1]}`;
}
