'use strict';

var core = require('@capacitor/core');
var app = require('@capacitor/app');

// noinspection JSUnusedGlobalSymbols
/**
 * The type of biometry supported by the device.
 */
exports.BiometryType = void 0;
(function (BiometryType) {
    BiometryType[BiometryType["none"] = 0] = "none";
    /**
     * iOS Touch ID
     */
    BiometryType[BiometryType["touchId"] = 1] = "touchId";
    /**
     * iOS Face ID
     */
    BiometryType[BiometryType["faceId"] = 2] = "faceId";
    /**
     * Android fingerprint authentication
     */
    BiometryType[BiometryType["fingerprintAuthentication"] = 3] = "fingerprintAuthentication";
    /**
     * Android face authentication
     */
    BiometryType[BiometryType["faceAuthentication"] = 4] = "faceAuthentication";
    /**
     * Android iris authentication
     */
    BiometryType[BiometryType["irisAuthentication"] = 5] = "irisAuthentication";
})(exports.BiometryType || (exports.BiometryType = {}));
exports.AndroidBiometryStrength = void 0;
(function (AndroidBiometryStrength) {
    /**
     * `authenticate()` will present any available biometry.
     */
    AndroidBiometryStrength[AndroidBiometryStrength["weak"] = 0] = "weak";
    /**
     * `authenticate()` will only present strong biometry.
     */
    AndroidBiometryStrength[AndroidBiometryStrength["strong"] = 1] = "strong";
})(exports.AndroidBiometryStrength || (exports.AndroidBiometryStrength = {}));
/**
 * If the `authenticate()` method throws an exception, the `BiometryError`
 * instance contains a `.code` property which will contain one of these strings,
 * indicating what the error was.
 *
 * See https://developer.apple.com/documentation/localauthentication/laerror
 * for a description of each error code.
 */
exports.BiometryErrorType = void 0;
(function (BiometryErrorType) {
    BiometryErrorType["none"] = "";
    BiometryErrorType["appCancel"] = "appCancel";
    BiometryErrorType["authenticationFailed"] = "authenticationFailed";
    BiometryErrorType["invalidContext"] = "invalidContext";
    BiometryErrorType["notInteractive"] = "notInteractive";
    BiometryErrorType["passcodeNotSet"] = "passcodeNotSet";
    BiometryErrorType["systemCancel"] = "systemCancel";
    BiometryErrorType["userCancel"] = "userCancel";
    BiometryErrorType["userFallback"] = "userFallback";
    BiometryErrorType["biometryLockout"] = "biometryLockout";
    BiometryErrorType["biometryNotAvailable"] = "biometryNotAvailable";
    BiometryErrorType["biometryNotEnrolled"] = "biometryNotEnrolled";
    BiometryErrorType["noDeviceCredential"] = "noDeviceCredential";
})(exports.BiometryErrorType || (exports.BiometryErrorType = {}));
/**
 * `authenticate()` throws instances of this class.
 */
class BiometryError {
    constructor(message, code) {
        this.message = message;
        this.code = code;
    }
}

const kBiometryTypeNameMap = {
    [exports.BiometryType.none]: '',
    [exports.BiometryType.touchId]: 'Touch ID',
    [exports.BiometryType.faceId]: 'Face ID',
    [exports.BiometryType.fingerprintAuthentication]: 'Fingerprint Authentication',
    [exports.BiometryType.faceAuthentication]: 'Face Authentication',
    [exports.BiometryType.irisAuthentication]: 'Iris Authentication',
};
/**
 * Return a human-readable name for a BiometryType.
 */
// eslint-disable-next-line import/prefer-default-export
function getBiometryName(type) {
    return kBiometryTypeNameMap[type] || '';
}

const proxy = core.registerPlugin('BiometricAuthNative', {
    web: async () => Promise.resolve().then(function () { return web; }).then((module) => new module.BiometricAuthWeb()),
    ios: async () => Promise.resolve().then(function () { return native; }).then((module) => new module.BiometricAuthNative(proxy)),
    android: async () => Promise.resolve().then(function () { return native; }).then((module) => new module.BiometricAuthNative(proxy)),
});

class BiometricAuthBase extends core.WebPlugin {
    async authenticate(options) {
        try {
            await this.internalAuthenticate(options);
        }
        catch (error) {
            // error will be an instance of CapacitorException on native platforms,
            // an instance of BiometryError on the web.
            if (error instanceof core.CapacitorException) {
                throw new BiometryError(error.message, error.code);
            }
            else {
                throw error;
            }
        }
    }
    async addResumeListener(listener) {
        return app.App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                this.checkBiometry()
                    .then((info) => {
                    listener(info);
                })
                    .catch(console.error);
            }
        });
    }
}

// eslint-disable-next-line import/prefer-default-export
class BiometricAuthWeb extends BiometricAuthBase {
    constructor() {
        super(...arguments);
        this.biometryType = exports.BiometryType.none;
        this.biometryTypes = [];
        this.biometryIsEnrolled = false;
        this.deviceIsSecure = false;
    }
    // On the web, return the fake biometry set by setBiometryType().
    async checkBiometry() {
        const hasBiometry = this.biometryType !== exports.BiometryType.none;
        const available = hasBiometry && this.biometryIsEnrolled;
        let reason = '';
        let code = exports.BiometryErrorType.none;
        if (!hasBiometry) {
            reason = 'No biometry is available';
            code = exports.BiometryErrorType.biometryNotAvailable;
        }
        else if (!this.biometryIsEnrolled) {
            reason = 'Biometry is not enrolled';
            code = exports.BiometryErrorType.biometryNotEnrolled;
        }
        return Promise.resolve({
            isAvailable: available,
            strongBiometryIsAvailable: this.biometryIsEnrolled && this.hasStrongBiometry(),
            biometryType: this.biometryType,
            biometryTypes: this.biometryTypes,
            deviceIsSecure: this.deviceIsSecure,
            reason,
            code,
        });
    }
    hasStrongBiometry() {
        return this.biometryTypes.some((type) => type === exports.BiometryType.faceId ||
            type === exports.BiometryType.touchId ||
            type === exports.BiometryType.fingerprintAuthentication);
    }
    /* eslint-disable no-alert */
    // On the web, fake authentication with a confirm dialog.
    async internalAuthenticate(options) {
        const result = await this.checkBiometry();
        // First try biometry if available.
        if (result.isAvailable) {
            if (confirm(
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- we want to use the default value if options?.reason is an empty string
            (options === null || options === void 0 ? void 0 : options.reason) ||
                `Authenticate with ${result.biometryTypes
                    .map((type) => getBiometryName(type))
                    .join(' or ')}?`)) {
                return;
            }
        }
        if (options === null || options === void 0 ? void 0 : options.allowDeviceCredential) {
            // Either biometry is not available, or the user declined to use it
            // and device security is allowed.
            if (result.deviceIsSecure) {
                if (confirm('Authenticate with device security?')) {
                    return;
                }
                else {
                    throw new BiometryError('User cancelled', exports.BiometryErrorType.userCancel);
                }
            }
            else if (result.isAvailable) {
                throw new BiometryError('Device is not secure', exports.BiometryErrorType.noDeviceCredential);
            }
        }
        else if (!result.isAvailable) {
            // Biometry is not available and device security is not allowed.
            if (result.biometryType === exports.BiometryType.none) {
                throw new BiometryError('Biometry is not available', exports.BiometryErrorType.biometryNotAvailable);
            }
            else {
                throw new BiometryError('Biometry is not enrolled', exports.BiometryErrorType.biometryNotEnrolled);
            }
        }
        // The user declined to use biometry and device credentials not allowed.
        throw new BiometryError('User cancelled', exports.BiometryErrorType.userCancel);
    }
    // Web only, used for simulating biometric authentication.
    async setBiometryType(type) {
        if (type === undefined) {
            return Promise.resolve();
        }
        const types = Array.isArray(type) ? type : [type];
        this.biometryTypes = [];
        this.biometryType = exports.BiometryType.none;
        if (types.length === 0) {
            return Promise.resolve();
        }
        if (isBiometryTypes(types)) {
            this.biometryType = types[0];
            if (this.biometryType !== exports.BiometryType.none) {
                this.biometryTypes = types;
            }
        }
        else {
            for (let i = 0; i < types.length; i++) {
                // eslint-disable-next-line no-prototype-builtins
                if (exports.BiometryType.hasOwnProperty(types[i])) {
                    const biometryType = exports.BiometryType[types[i]];
                    if (this.biometryType === exports.BiometryType.none) {
                        this.biometryTypes = [];
                    }
                    else {
                        this.biometryTypes.push(biometryType);
                    }
                    if (i === 0) {
                        this.biometryType = biometryType;
                    }
                }
            }
        }
        return Promise.resolve();
    }
    // Web only, used for simulating device unlock security.
    async setBiometryIsEnrolled(enrolled) {
        this.biometryIsEnrolled = enrolled;
        return Promise.resolve();
    }
    // Web only, used for simulating device unlock security.
    async setDeviceIsSecure(isSecure) {
        this.deviceIsSecure = isSecure;
        return Promise.resolve();
    }
}
function isBiometryTypes(value) {
    return Object.values(exports.BiometryType).includes(value[0]);
}

var web = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BiometricAuthWeb: BiometricAuthWeb
});

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/require-await */
// eslint-disable-next-line import/prefer-default-export
class BiometricAuthNative extends BiometricAuthBase {
    constructor(capProxy) {
        super();
        /*
          In order to call native methods and maintain the ability to
          call pure Javascript methods as well, we have to bind the native methods
          to the proxy.
    
          capProxy is a proxy of an instance of this class, so it is safe
          to cast it to this class.
        */
        const proxy = capProxy;
        /* eslint-disable @typescript-eslint/unbound-method */
        this.checkBiometry = proxy.checkBiometry;
        this.internalAuthenticate = proxy.internalAuthenticate;
        /* eslint-enable @typescript-eslint/unbound-method */
    }
    // @native
    async checkBiometry() {
        // Never used, but we have to satisfy the compiler.
        return Promise.resolve({
            isAvailable: false,
            strongBiometryIsAvailable: false,
            biometryType: exports.BiometryType.none,
            biometryTypes: [],
            deviceIsSecure: false,
            reason: '',
            code: exports.BiometryErrorType.none,
            strongReason: '',
            strongCode: exports.BiometryErrorType.none,
        });
    }
    // @native
    // On native platforms, this will present the native authentication UI.
    async internalAuthenticate(options) { }
    // Web only, used for simulating biometric authentication.
    async setBiometryType(type) {
        console.warn('setBiometryType() is web only');
    }
    // Web only, used for simulating biometry enrollment.
    async setBiometryIsEnrolled(enrolled) {
        console.warn('setBiometryEnrolled() is web only');
    }
    // Web only, used for simulating device security.
    async setDeviceIsSecure(isSecure) {
        console.warn('setDeviceIsSecure() is web only');
    }
}

var native = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BiometricAuthNative: BiometricAuthNative
});

exports.BiometricAuth = proxy;
exports.BiometryError = BiometryError;
exports.getBiometryName = getBiometryName;
