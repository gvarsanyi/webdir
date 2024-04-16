
export interface Address {
  host: string;
  port: number;
}

export interface Mount {
  fsPath: string;
  urlPath: string;
}

export type VagueAddress = Partial<Address> | Partial<Address>[];

export type VagueMount = Partial<Mount> | Partial<Mount>[];

export interface OpMount {
  mount: Mount;
}

export interface OpNoIndex {
  noIndex: boolean;
}

export interface OpOutput {
  output: string;
}

export interface OpSinglePageApp {
  singlePageApp: boolean;
}

export interface OpStart {
  start: true;
}

export interface OpStatus {
  status: true;
}

export interface OpStop {
  stop: true;
}

export interface OpUnmount {
  unmount: Mount;
}

export type ServiceOp = OpMount | OpNoIndex | OpOutput | OpSinglePageApp | OpStatus | OpStop | OpUnmount;

export interface ServiceOpResult {
  error?: boolean;
  message?: string;
  op: WebdirOp;
  success: boolean;
  status?: { mounts: Mount[]; } & OpNoIndex & OpOutput & OpSinglePageApp;
}

export interface VagueOp {
  mount?: VagueMount;
  noIndex?: boolean;
  output?: string;
  singlePageApp?: boolean;
  unmount?: VagueMount;
}

export type WebdirOp = OpStart | ServiceOp;

export interface ServiceResult {
  error?: boolean;
  results: ServiceOpResult[];
}

export type WebdirOpResult = Omit<ServiceOpResult, 'op'> & {
  op: WebdirOp;
}

export interface WebdirResult {
  error?: boolean;
  services: {
    address: Address;
    results: WebdirOpResult[];
  }[];
  success?: 'full' | 'partial';
}

export interface ServiceLogEntry {
  error?: boolean;
  id: number;
  t: number;
  msg: string;
}
