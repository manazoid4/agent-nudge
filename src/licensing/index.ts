import {
  createPublicKey,
  randomUUID,
  verify as verifySignature,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type Entitlement =
  | "managed_workspaces"
  | "automatic_drift"
  | "custom_profiles"
  | "changelog_write"
  | "agent_launch";

export type LicensePayload = {
  version: 1;
  licenseId: string;
  plan: "pro" | "studio";
  entitlements: Entitlement[];
  issuedAt: string;
  expiresAt: string;
};

type LicenseState = {
  installId: string;
  trialStartedAt: string;
  token?: string;
};

export type LicenseStatus = {
  plan: "community" | "trial" | "pro" | "studio";
  active: boolean;
  entitlements: Entitlement[];
  expiresAt?: string;
  trialDaysRemaining?: number;
  checkoutUrl: string;
};

const PRO_ENTITLEMENTS: Entitlement[] = [
  "managed_workspaces",
  "automatic_drift",
  "custom_profiles",
  "changelog_write",
  "agent_launch",
];

const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAxqQDoX3o+P2c4eP8YyMj8W3DL6K5pLGmXF5hYYSEjKw=
-----END PUBLIC KEY-----`;

export class LicenseService {
  private readonly statePath: string;
  private readonly publicKey: string;
  private readonly checkoutUrl: string;
  private readonly now: () => Date;

  constructor(options: {
    statePath: string;
    publicKey?: string;
    checkoutUrl?: string;
    now?: () => Date;
  }) {
    this.statePath = options.statePath;
    this.publicKey =
      options.publicKey ??
      process.env.AGENT_NUDGE_LICENSE_PUBLIC_KEY?.replaceAll("\\n", "\n") ??
      DEFAULT_PUBLIC_KEY;
    this.checkoutUrl =
      options.checkoutUrl ??
      process.env.AGENT_NUDGE_CHECKOUT_URL ??
      "https://agent-nudge-bay.vercel.app/#pricing";
    this.now = options.now ?? (() => new Date());
  }

  status(): LicenseStatus {
    const state = this.readState();
    if (state.token) {
      const payload = verifyLicenseToken(state.token, this.publicKey);
      if (
        payload &&
        new Date(payload.expiresAt).getTime() > this.now().getTime()
      ) {
        return {
          plan: payload.plan,
          active: true,
          entitlements: payload.entitlements,
          expiresAt: payload.expiresAt,
          checkoutUrl: this.checkoutUrl,
        };
      }
    }
    const elapsed =
      this.now().getTime() - new Date(state.trialStartedAt).getTime();
    const remaining = Math.max(0, 14 - Math.floor(elapsed / 86_400_000));
    if (remaining > 0) {
      return {
        plan: "trial",
        active: true,
        entitlements: PRO_ENTITLEMENTS,
        trialDaysRemaining: remaining,
        expiresAt: new Date(
          new Date(state.trialStartedAt).getTime() + 14 * 86_400_000,
        ).toISOString(),
        checkoutUrl: this.checkoutUrl,
      };
    }
    return {
      plan: "community",
      active: true,
      entitlements: [],
      checkoutUrl: this.checkoutUrl,
    };
  }

  activate(token: string) {
    const payload = verifyLicenseToken(token, this.publicKey);
    if (!payload) throw new Error("invalid_license_signature");
    if (new Date(payload.expiresAt).getTime() <= this.now().getTime())
      throw new Error("license_expired");
    const state = this.readState();
    this.writeState({ ...state, token });
    return this.status();
  }

  deactivate() {
    const state = this.readState();
    this.writeState({ ...state, token: undefined });
    return this.status();
  }

  has(entitlement: Entitlement) {
    return this.status().entitlements.includes(entitlement);
  }

  require(entitlement: Entitlement) {
    if (!this.has(entitlement)) throw new Error(`pro_required:${entitlement}`);
  }

  private readState(): LicenseState {
    if (existsSync(this.statePath)) {
      return JSON.parse(readFileSync(this.statePath, "utf8")) as LicenseState;
    }
    const state = {
      installId: randomUUID(),
      trialStartedAt: this.now().toISOString(),
    };
    this.writeState(state);
    return state;
  }

  private writeState(state: LicenseState) {
    mkdirSync(dirname(this.statePath), { recursive: true });
    writeFileSync(this.statePath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
}

export function verifyLicenseToken(token: string, publicKeyPem: string) {
  const [payloadPart, signaturePart, extra] = token.split(".");
  if (!payloadPart || !signaturePart || extra) return undefined;
  try {
    const valid = verifySignature(
      null,
      Buffer.from(payloadPart),
      createPublicKey(publicKeyPem),
      Buffer.from(signaturePart, "base64url"),
    );
    if (!valid) return undefined;
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as LicensePayload;
    if (
      payload.version !== 1 ||
      !payload.licenseId ||
      !["pro", "studio"].includes(payload.plan) ||
      !Array.isArray(payload.entitlements) ||
      !payload.expiresAt
    )
      return undefined;
    return payload;
  } catch {
    return undefined;
  }
}
