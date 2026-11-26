/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        viewer: { token: string; login: string } | null;
        sessionState: "none" | "valid" | "expired";
    }
}
