/** SDK configuration */
export interface AdpClientConfig {
  readonly baseUrl?: string;
  readonly tokenUrl?: string;
  readonly certPath?: string;
  readonly keyPath?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly timeoutMs?: number;
  readonly logger?: (message: string) => void;
  /** Set to false to disable server certificate verification (e.g. self-signed CA). Default: true (secure). */
  readonly rejectUnauthorized?: boolean;
}

/** Raw ADP API response shapes */

export interface AdpNameCode {
  codeValue: string;
  shortName?: string;
  longName?: string;
}

export interface AdpLegalName {
  givenName: string;
  middleName?: string;
  familyName1: string;
}

export interface AdpCommunication {
  landlines?: Array<{ formattedNumber: string }>;
  mobiles?: Array<{ formattedNumber: string }>;
  emails?: Array<{ emailUri: string }>;
}

export interface AdpBusinessCommunication {
  emails?: Array<{ emailUri: string }>;
}

export interface AdpWorkerStatus {
  statusCode: AdpNameCode;
}

export interface AdpWorkerDates {
  originalHireDate?: string;
  terminationDate?: string;
}

export interface AdpHomeOrganizationalUnit {
  nameCode: AdpNameCode;
}

export interface AdpReportsTo {
  associateOID: string;
}

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

export interface AdpCompetency {
  competencyNameCode: AdpNameCode;
  categoryCode: AdpNameCode;
  acquisitionDate?: string;
  experienceDuration?: string;
}

export interface AdpVacationBalance {
  timeOffPolicyCode: AdpNameCode;
  balanceAsOfDate?: string;
  totalHoursQuantity?: number;
  usedHoursQuantity?: number;
  plannedHoursQuantity?: number;
  availableHoursQuantity?: number;
}
