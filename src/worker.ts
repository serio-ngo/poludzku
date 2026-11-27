import { handle } from "@astrojs/cloudflare/handler";
import { DurableObject } from "cloudflare:workers";
import { route as game } from "find-the-gap/game/worker/route.ts";
import { deleteRec, getRec, putRec, type SessionRec } from "./lib/session.ts";

export class SessionDO extends DurableObject {
    put(rec: SessionRec) {
        return putRec(this.ctx.storage, rec);
    }
    get() {
        return getRec(this.ctx.storage);
    }
    delete() {
        return deleteRec(this.ctx.storage);
    }
    alarm() {
        return this.ctx.storage.deleteAll();
    }
}

export default {
    fetch(req: Request, env: Env, ctx: ExecutionContext) {
        return new URL(req.url).pathname.startsWith("/api/game/")
            ? game(req, { DB: env.GAME_DB, LIMIT: env.RL_GAME }, ctx)
            : handle(req, env, ctx);
    },
};
