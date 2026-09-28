import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type ResidentCredential = { district: bigint;
                                   age: bigint;
                                   holderSecret: Uint8Array
                                 };

export enum ResponseCategory { SUPPORT = 0, UNSURE = 1, CONCERN = 2 }

export type Witnesses<PS> = {
  localResidentCredential(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, ResidentCredential];
  localAdminSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  submitResponse(context: __compactRuntime.CircuitContext<PS>,
                 category_0: ResponseCategory): __compactRuntime.CircuitResults<PS, []>;
  closeCampaign(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  submitResponse(context: __compactRuntime.CircuitContext<PS>,
                 category_0: ResponseCategory): __compactRuntime.CircuitResults<PS, []>;
  closeCampaign(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  deriveNullifier(secret_0: Uint8Array, publicCampaignId_0: Uint8Array): Uint8Array;
  deriveAdminCommitment(secret_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  deriveNullifier(context: __compactRuntime.CircuitContext<PS>,
                  secret_0: Uint8Array,
                  publicCampaignId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveAdminCommitment(context: __compactRuntime.CircuitContext<PS>,
                        secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  submitResponse(context: __compactRuntime.CircuitContext<PS>,
                 category_0: ResponseCategory): __compactRuntime.CircuitResults<PS, []>;
  closeCampaign(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly campaignId: Uint8Array;
  readonly requiredDistrict: bigint;
  readonly minimumAge: bigint;
  readonly adminCommitment: Uint8Array;
  readonly active: boolean;
  usedNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly supportCount: bigint;
  readonly unsureCount: bigint;
  readonly concernCount: bigint;
  readonly responseCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               publicCampaignId_0: Uint8Array,
               publicDistrict_0: bigint,
               publicMinimumAge_0: bigint,
               publicAdminCommitment_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
