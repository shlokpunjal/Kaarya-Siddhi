export const isValidEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
};

export const isValidPhone = (value: string): boolean => {
  return /^\d{10}$/.test(value.trim());
};

export const isValidName = (value: string) => /^[A-Za-z\s]+$/.test(value.trim());