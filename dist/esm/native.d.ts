import { BiometricAuthBase } from './base';
import type { AuthenticateOptions, BiometricAuthPlugin, CheckBiometryResult } from './definitions';
import { BiometryType } from './definitions';
export declare class BiometricAuthNative extends BiometricAuthBase {
    constructor(capProxy: BiometricAuthPlugin);
    checkBiometry(): Promise<CheckBiometryResult>;
    internalAuthenticate(options?: AuthenticateOptions): Promise<void>;
    setBiometryType(type: BiometryType | string | Array<BiometryType | string> | undefined): Promise<void>;
    setBiometryIsEnrolled(enrolled: boolean): Promise<void>;
    setDeviceIsSecure(isSecure: boolean): Promise<void>;
}
