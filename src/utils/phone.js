export const PHONE_VALIDATION_MESSAGE = "Phone number must be exactly 10 digits.";

export const digitsOnlyPhone = (value) => value.replace(/\D/g, "");

export const isValidPhoneNumber = (phone) => /^\d{10}$/.test(phone);
