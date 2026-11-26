import { handle } from "@astrojs/cloudflare/handler";
import { DurableObject } from "cloudflare:workers";
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

export default { fetch: handle };
