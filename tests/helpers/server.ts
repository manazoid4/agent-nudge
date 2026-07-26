import type { createServer as CreateServer } from "../../src/daemon/server.js";
import { createServer } from "../../src/daemon/server.js";
import { LocalControlAuth } from "../../src/security/local-control.js";
import type { NudgeDatabase } from "../../src/storage/database.js";
import type { InjectOptions } from "light-my-request";

type Services = NonNullable<Parameters<typeof CreateServer>[1]>;

export function createTestServer(
  database: NudgeDatabase,
  services: Omit<Services, "auth"> = {},
) {
  const controlAuth = LocalControlAuth.ephemeral();
  const app = createServer(database, { ...services, auth: controlAuth });
  const inject = app.inject.bind(app);
  const authenticatedInject = (options: string | InjectOptions) => {
    const request: InjectOptions =
      typeof options === "string" ? { method: "GET", url: options } : options;
    return inject({
      ...request,
      headers: {
        ...request.headers,
        authorization: controlAuth.authorizationHeader(),
      },
    });
  };
  app.inject = authenticatedInject as unknown as typeof app.inject;
  return Object.assign(app, {
    controlAuth,
    controlAuthorization: controlAuth.authorizationHeader(),
  });
}
