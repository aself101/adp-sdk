/**
 * SDK configuration for the ADP Workforce API client.
 *
 * All fields are optional in the interface because they can be provided via environment variables.
 * However, the following four fields are **required** — either here or via their env var:
 * - `certPath` (or `ADP_CERT_PATH`)
 * - `keyPath` (or `ADP_KEY_PATH`)
 * - `clientId` (or `ADP_CLIENT_ID`)
 * - `clientSecret` (or `ADP_CLIENT_SECRET`)
 *
 * If a required field is missing from both config and environment, the constructor throws.
 */
export interface AdpClientConfig {
  /** ADP API base URL. Default: `https://api.adp.com` (or `ADP_BASE_URL` env var) */
  readonly baseUrl?: string;
  /** OAuth token endpoint URL. Default: ADP's standard token URL (or `ADP_TOKEN_URL` env var) */
  readonly tokenUrl?: string;
  /** Path to mTLS client certificate PEM file. **Required** (or `ADP_CERT_PATH` env var) */
  readonly certPath?: string;
  /** Path to mTLS client private key PEM file. **Required** (or `ADP_KEY_PATH` env var) */
  readonly keyPath?: string;
  /** OAuth client ID. **Required** (or `ADP_CLIENT_ID` env var) */
  readonly clientId?: string;
  /** OAuth client secret. **Required** (or `ADP_CLIENT_SECRET` env var) */
  readonly clientSecret?: string;
  /** Request timeout in milliseconds. Default: 30000 */
  readonly timeoutMs?: number;
  /** Optional logger callback for SDK diagnostic messages */
  readonly logger?: (message: string) => void;
  /** Set to `false` to disable TLS certificate verification (e.g. self-signed CA). Default: `true` (secure). **Not recommended for production.** */
  readonly rejectUnauthorized?: boolean;
}

/** ADP name/code pair used across API responses for coded values */
export interface AdpNameCode {
  codeValue: string;
  shortName?: string;
  longName?: string;
}

/** Worker's legal name as recorded in ADP */
export interface AdpLegalName {
  givenName: string;
  middleName?: string;
  familyName1: string;
}

/** Personal contact information (landlines, mobiles, emails) */
export interface AdpCommunication {
  landlines?: Array<{ formattedNumber: string }>;
  mobiles?: Array<{ formattedNumber: string }>;
  emails?: Array<{ emailUri: string }>;
}

/** Work/business contact information */
export interface AdpBusinessCommunication {
  emails?: Array<{ emailUri: string }>;
}

/** Worker employment status (active, terminated, etc.) */
export interface AdpWorkerStatus {
  statusCode: AdpNameCode;
}

/** Key employment dates (hire, termination) */
export interface AdpWorkerDates {
  originalHireDate?: string;
  terminationDate?: string;
}

/** Organizational unit (department, division, etc.) */
export interface AdpHomeOrganizationalUnit {
  nameCode: AdpNameCode;
}

/** Manager/supervisor reference by associate OID */
export interface AdpReportsTo {
  associateOID: string;
}

/** Work assignment record — job title, location, pay group, and reporting structure */
export interface AdpWorkAssignment {
  primaryIndicator: boolean;
  jobTitle?: string;
  payrollFileNumber?: string;
  payGradeCode?: AdpNameCode;
  homeWorkLocation?: { nameCode: AdpNameCode };
  workerTypeCode?: AdpNameCode;
  homeOrganizationalUnits?: AdpHomeOrganizationalUnit[];
  payrollGroupCode?: string;
  reportsTo?: AdpReportsTo[];
}

/** Custom field group containing organization-specific coded, date, string, indicator, and number fields */
export interface AdpCustomFieldGroup {
  codeFields?: Array<{
    nameCode: AdpNameCode;
    codeValue: string;
  }>;
  dateFields?: Array<{
    nameCode: AdpNameCode;
    dateValue: string;
  }>;
  stringFields?: Array<{
    nameCode: AdpNameCode;
    stringValue: string;
  }>;
  indicatorFields?: Array<{
    nameCode: AdpNameCode;
    indicatorValue: boolean;
  }>;
  numberFields?: Array<{
    nameCode: AdpNameCode;
    numberValue: number;
  }>;
}

/** Raw ADP worker record as returned by `/hr/v2/workers` */
export interface AdpWorkerRaw {
  associateOID: string;
  person: {
    legalName: AdpLegalName;
    communication?: AdpCommunication;
  };
  businessCommunication?: AdpBusinessCommunication;
  workerStatus?: AdpWorkerStatus;
  workerDates: AdpWorkerDates;
  workAssignments: AdpWorkAssignment[];
  customFieldGroup?: AdpCustomFieldGroup;
}

/** Worker competency/skill record from `/talent/v2/associates` */
export interface AdpCompetency {
  competencyNameCode: AdpNameCode;
  categoryCode: AdpNameCode;
  acquisitionDate?: string;
  experienceDuration?: string;
}

/** Time-off/vacation balance record from `/time/v2/workers` */
export interface AdpVacationBalance {
  timeOffPolicyCode: AdpNameCode;
  balanceAsOfDate?: string;
  totalHoursQuantity?: number;
  usedHoursQuantity?: number;
  plannedHoursQuantity?: number;
  availableHoursQuantity?: number;
}
