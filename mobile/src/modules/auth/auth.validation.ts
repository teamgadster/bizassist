// path: src/modules/auth/auth.validation.ts

import { emailRegex, nameRegex } from "@/shared/validation/patterns";
import { FIELD_LIMITS } from "@/shared/fieldLimits";

// Returns error message string or null if valid.

export const validateFirstName = (rawValue: string): string | null => {
	const value = rawValue.trim();

	if (value.length < FIELD_LIMITS.firstNameMin) {
		return `First name must be at least ${FIELD_LIMITS.firstNameMin} characters`;
	}
	if (value.length > FIELD_LIMITS.firstName) {
		return `First name must be at most ${FIELD_LIMITS.firstName} characters`;
	}
	if (!nameRegex.test(value)) {
		return "First name contains invalid characters";
	}
	return null;
};

export const validateLastName = (rawValue: string): string | null => {
	const value = rawValue.trim();

	if (value.length < FIELD_LIMITS.lastNameMin) {
		return `Last name must be at least ${FIELD_LIMITS.lastNameMin} characters`;
	}
	if (value.length > FIELD_LIMITS.lastName) {
		return `Last name must be at most ${FIELD_LIMITS.lastName} characters`;
	}
	if (!nameRegex.test(value)) {
		return "Last name contains invalid characters";
	}
	return null;
};

export const validateEmail = (rawValue: string): string | null => {
	const value = rawValue.trim();

	if (!value) {
		return "Email is required";
	}
	if (value.length > FIELD_LIMITS.email) {
		return `Email must be ${FIELD_LIMITS.email} characters or less`;
	}
	if (!emailRegex.test(value)) {
		return "Invalid email address";
	}
	return null;
};

export const validatePasswordForRegister = (value: string): string | null => {
	if (!value) {
		return "Password is required";
	}
	if (value.length < FIELD_LIMITS.passwordMin) {
		return `Password must be at least ${FIELD_LIMITS.passwordMin} characters`;
	}
	if (value.length > FIELD_LIMITS.password) {
		return `Password must be ${FIELD_LIMITS.password} characters or less`;
	}
	return null;
};

export const validatePasswordForLogin = (value: string): string | null => {
	if (!value) {
		return "Password is required";
	}
	if (value.length < FIELD_LIMITS.passwordMin) {
		return `Password must be at least ${FIELD_LIMITS.passwordMin} characters`;
	}
	if (value.length > FIELD_LIMITS.password) {
		return `Password must be ${FIELD_LIMITS.password} characters or less`;
	}
	return null;
};
