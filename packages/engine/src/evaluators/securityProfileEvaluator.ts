export interface SecurityProfile {
  id: string;
  type: 'av' | 'ips' | 'ssl';
  action: 'block' | 'alert' | 'decrypt';
  targetSignatures?: string[]; // e.g. "EICAR", "log4j"
}

export interface ProfileEvaluationResult {
  success: boolean;
  message: string;
}

export function evaluateSecurityProfiles(
  configuredProfiles: SecurityProfile[],
  expectedTypes: ('av' | 'ips' | 'ssl')[],
  expectedAction: 'block' | 'alert' | 'decrypt'
): ProfileEvaluationResult {
  if (configuredProfiles.length === 0) {
    return { success: false, message: "No security profiles configured." };
  }

  for (const expectedType of expectedTypes) {
    const profile = configuredProfiles.find(p => p.type === expectedType);
    if (!profile) {
      return { success: false, message: `Missing required ${expectedType.toUpperCase()} profile.` };
    }
    if (profile.action !== expectedAction && !(expectedType === 'ssl' && profile.action === 'decrypt')) {
      return { success: false, message: `${expectedType.toUpperCase()} profile must be set to ${expectedAction}.` };
    }
  }

  return { success: true, message: "Security profiles correctly configured." };
}
